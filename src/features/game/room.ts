// Realtime match room: two human players over Socket.io broadcast.
// Server-authoritative: clients send { from, to } hops only; this module
// validates, persists (Move + GameState), enforces clocks/timeouts, and
// broadcasts the fresh room view.
// Phase 4: finished RATED matches are settled (stats/xp/elo/simulated
// ledger) exactly once via settleMatchIfNeeded. DEMO matches stay free.

import { prisma } from "@/lib/prisma";
import {
  initialBoard,
  otherColor,
  resolveStatus,
  squareNumber,
  type Piece,
  type PlayerColor,
} from "./engine";
import { validateHop } from "./hops";
import {
  DISCONNECT_TIMEOUT_MS,
  broadcastMatch,
  getForced,
  getIO,
  getPresence,
  setForced,
} from "./realtime";
import { settleMatchIfNeeded } from "@/features/competitive/settle";

export class RoomError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "RoomError";
  }
}

// ------------------------------------------------------------------- views

export interface RoomPlayerView {
  seat: number;
  color: string;
  name: string;
  level: number;
  rating: number;
  isEngine: boolean;
  userId: string | null;
  connected: boolean;
}

export interface RoomStateView {
  board: number[];
  turn: string;
  status: string;
  winnerSeat: number | null;
  endReason: string | null;
  whiteMs: number;
  blackMs: number;
  forcedFrom: number | null; // mid multi-jump: square the mover must continue from
  moveNumber: number;
  quietPlies: number;
}

export interface RoomView {
  matchId: string;
  mode: string;
  status: string;
  stake: number; // DEMO units (0 = free)
  youSeat: number | null; // null for spectators / broadcasts
  players: RoomPlayerView[];
  state: RoomStateView;
  /** captured.white = WHITE pieces captured; captured.black = BLACK pieces captured. */
  captured: { white: number; black: number };
  moves: { notation: string; seat: number }[];
  serverTime: number;
}

function seatOfColor(players: { seat: number; color: string }[], color: string): number | null {
  return players.find((p) => p.color === color)?.seat ?? null;
}

/** Build the serializable room view. `youSeat` null → spectator/broadcast view. */
export async function buildRoom(matchId: string, youSeat: number | null): Promise<RoomView | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: { include: { user: true } }, state: true },
  });
  if (!match || !match.state) return null;

  const moves = await prisma.move.findMany({
    where: { matchId },
    orderBy: { moveNumber: "asc" },
    take: 200,
    select: { notation: true, seat: true },
  });

  let white = 0;
  let black = 0;
  for (const p of match.state.board) {
    if (p === 1 || p === 2) white++;
    else if (p === 3 || p === 4) black++;
  }

  const presence = getPresence(matchId);

  return {
    matchId: match.id,
    mode: match.mode,
    status: match.status,
    stake: match.stake,
    youSeat,
    players: [...match.players]
      .sort((a, b) => a.seat - b.seat)
      .map((p) => ({
        seat: p.seat,
        color: p.color,
        isEngine: p.isEngine,
        userId: p.userId,
        name: p.isEngine ? "Engine" : p.user?.username ?? "Open seat",
        level: p.user?.level ?? 1,
        rating: p.user?.rating ?? 1000,
        connected: presence?.get(p.seat)?.disconnectedAt ? false : true,
      })),
    state: {
      board: match.state.board,
      turn: match.state.turn,
      status: match.state.status,
      winnerSeat: match.state.winnerSeat,
      endReason: match.state.endReason,
      whiteMs: match.state.whiteMs,
      blackMs: match.state.blackMs,
      forcedFrom: getForced(matchId),
      moveNumber: match.state.moveNumber,
      quietPlies: match.state.quietPlies,
    },
    captured: { white: 12 - white, black: 12 - black },
    moves,
    serverTime: Date.now(),
  };
}

/** Load the room for a specific user (spectators get youSeat=null). Also runs the timeout sweep. */
export async function loadRoom(matchId: string, userId: string): Promise<RoomView | null> {
  ensureSweep();
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { players: true } });
  if (!match) return null;
  const seat = match.players.find((p) => p.userId === userId)?.seat ?? null;
  return buildRoom(matchId, seat);
}

// --------------------------------------------------------------- lifecycle

/** Create a DEMO match: creator is WHITE (seat 0), BLACK (seat 1) is open. */
export async function createDemoMatch(userId: string): Promise<RoomView> {
  const match = await prisma.match.create({
    data: {
      mode: "DEMO",
      players: {
        create: [
          { userId, seat: 0, color: "WHITE", isEngine: false },
          { seat: 1, color: "BLACK", isEngine: false }, // open seat
        ],
      },
      state: { create: { board: gameBoard(), turn: "WHITE", status: "ACTIVE" } },
    },
  });
  const view = await buildRoom(match.id, 0);
  if (!view) throw new RoomError(500, "INTERNAL", "Failed to create match.");
  return view;
}

function gameBoard(): number[] {
  return initialBoard() as unknown as number[];
}

/** Claim the open BLACK seat as the second player (demo: open to any signed-in user). */
export async function joinMatch(matchId: string, userId: string): Promise<RoomView> {
  ensureSweep();
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { players: true } });
  if (!match) throw new RoomError(404, "NOT_FOUND", "Match not found.");
  if (match.status !== "ACTIVE") throw new RoomError(409, "GAME_OVER", "This match is already over.");

  const existing = match.players.find((p) => p.userId === userId);
  if (existing) {
    const v = await buildRoom(matchId, existing.seat);
    if (!v) throw new RoomError(404, "NOT_FOUND", "Match not found.");
    return v;
  }

  const open = match.players.find((p) => p.userId === null && !p.isEngine);
  if (!open) throw new RoomError(409, "SEAT_TAKEN", "Both seats are taken.");

  await prisma.matchPlayer.update({ where: { id: open.id }, data: { userId } });
  await prisma.auditLog.create({
    data: { userId, action: "MATCH_SEAT_CLAIMED", meta: { matchId, seat: open.seat } },
  });

  const broadcast = await buildRoom(matchId, null);
  if (broadcast) broadcastMatch(matchId, broadcast);

  const view = await buildRoom(matchId, open.seat);
  if (!view) throw new RoomError(404, "NOT_FOUND", "Match not found.");
  return view;
}

// --------------------------------------------------------------- game flow

/** Persist a finished game: GameState + Match winner, then settle if RATED. */
async function finalizeMatch(matchId: string, winnerSeat: number | null, reason: string): Promise<void> {
  const st = await prisma.gameState.findUnique({ where: { matchId } });
  if (!st || st.status !== "ACTIVE") return;
  await prisma.gameState.update({
    where: { id: st.id },
    data: { status: "FINISHED", winnerSeat, endReason: reason },
  });
  await prisma.match.update({ where: { id: matchId }, data: { status: "FINISHED" } });
  setForced(matchId, null);
  const view = await buildRoom(matchId, null);
  if (view) broadcastMatch(matchId, view);
  await settleMatchIfNeeded(matchId); // idempotent; only applies to RATED matches
}

/**
 * Submit ONE hop { from, to } for the requesting player.
 * Validates seat + turn + hop server-side, ticks the mover's clock, persists,
 * resolves win/draw, and broadcasts. Multi-jump continues via forcedFrom.
 */
export async function submitRoomMove(
  matchId: string,
  userId: string,
  from: number,
  to: number
): Promise<RoomView> {
  ensureSweep();
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: true, state: true },
  });
  if (!match || !match.state) throw new RoomError(404, "NOT_FOUND", "Match not found.");
  if (match.status !== "ACTIVE" || match.state.status !== "ACTIVE") {
    throw new RoomError(409, "GAME_OVER", "This game is already over.");
  }

  const me = match.players.find((p) => p.userId === userId);
  if (!me) throw new RoomError(403, "FORBIDDEN", "You are not a player in this match.");
  if (me.isEngine) throw new RoomError(403, "FORBIDDEN", "Engine seats cannot move via the API.");
  if (match.state.turn !== me.color) {
    throw new RoomError(409, "WRONG_TURN", "It is not your turn.");
  }

  const forced = getForced(matchId);
  if (forced !== null && from !== forced) {
    throw new RoomError(422, "FORCED_CONTINUE", "Multi-jump: continue with the same piece.");
  }

  // --- clock: consume elapsed time from the mover's remaining budget ---
  const now = new Date();
  const elapsedMs = now.getTime() - match.state.clockUpdatedAt.getTime();
  let whiteMs = match.state.whiteMs;
  let blackMs = match.state.blackMs;
  const remaining = (me.color === "WHITE" ? whiteMs : blackMs) - elapsedMs;
  if (remaining <= 0) {
    const winnerSeat = match.players.find((p) => p.seat !== me.seat)?.seat ?? null;
    await finalizeMatch(matchId, winnerSeat, "timeout");
    throw new RoomError(409, "GAME_OVER", "Your clock expired.");
  }
  if (me.color === "WHITE") whiteMs = Math.round(remaining);
  else blackMs = Math.round(remaining);

  // --- validate the hop against the rules engine ---
  const hop = validateHop(match.state.board as unknown as Piece[], me.color as PlayerColor, from, to);
  if (!hop.ok) throw new RoomError(422, hop.code, hop.error);

  const nextForced = hop.mustContinue ? to : null;
  setForced(matchId, nextForced);

  const notation = `${squareNumber(from)}${hop.capturedNow.length > 0 ? "x" : "-"}${squareNumber(to)}`;
  await prisma.move.create({
    data: {
      matchId,
      moveNumber: match.state.moveNumber,
      seat: me.seat,
      from,
      path: [to],
      captured: hop.capturedNow,
      notation,
      isPartial: hop.mustContinue,
    },
  });

  let status = "ACTIVE";
  let winnerSeat: number | null = null;
  let endReason: string | null = null;
  let quietPlies = match.state.quietPlies;
  let turn = match.state.turn;

  if (!hop.mustContinue) {
    quietPlies = hop.capturedNow.length > 0 || hop.promotion ? 0 : match.state.quietPlies + 1;
    const verdict = resolveStatus(hop.board, otherColor(me.color as PlayerColor), quietPlies);
    if (verdict.status === "DRAW") {
      status = "DRAW";
      endReason = "40 quiet moves";
    } else if (verdict.status === "FINISHED") {
      status = "FINISHED";
      winnerSeat = seatOfColor(match.players, verdict.winner!);
      endReason = "no pieces or no moves";
    }
    turn = otherColor(me.color as PlayerColor);
  }

  const moveNumber = hop.mustContinue ? match.state.moveNumber : match.state.moveNumber + 1;

  await prisma.gameState.update({
    where: { id: match.state.id },
    data: {
      board: hop.board as unknown as number[],
      turn,
      status,
      winnerSeat,
      endReason,
      quietPlies,
      moveNumber,
      whiteMs,
      blackMs,
      clockUpdatedAt: now,
    },
  });

  if (status !== "ACTIVE") {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: status as "FINISHED" | "DRAW" },
    });
    setForced(matchId, null);
    await settleMatchIfNeeded(matchId); // idempotent; only applies to RATED matches
  }

  const broadcast = await buildRoom(matchId, null);
  if (broadcast) broadcastMatch(matchId, broadcast);

  const view = await buildRoom(matchId, me.seat);
  if (!view) throw new RoomError(404, "NOT_FOUND", "Match not found.");
  return view;
}

// ------------------------------------------------------- timeouts (sweep)

let sweepStarted = false;

/**
 * DEMO sweep every 5s (single process): finalizes matches where the side to
 * move ran out of clock, or has been disconnected > DISCONNECT_TIMEOUT_MS.
 * Disconnect verdicts are presence-based and in-memory by design.
 */
export function ensureSweep(): void {
  const g = globalThis as unknown as { __damaSweep?: boolean };
  if (g.__damaSweep) return;
  g.__damaSweep = true;
  const timer = setInterval(() => {
    sweepOnce().catch(() => {});
  }, 5000);
  timer.unref?.();
}

async function sweepOnce(): Promise<void> {
  if (!getIO()) return; // dev mode without the custom server: no realtime sweep
  const matches = await prisma.match.findMany({
    where: { status: "ACTIVE" },
    include: { state: true, players: true },
    take: 100,
  });
  const now = Date.now();

  for (const m of matches) {
    const st = m.state;
    if (!st) continue;
    const seatToMove = seatOfColor(m.players, st.turn);
    if (seatToMove === null) continue;

    const elapsed = now - st.clockUpdatedAt.getTime();
    const remaining = (st.turn === "WHITE" ? st.whiteMs : st.blackMs) - elapsed;

    let reason: string | null = null;
    if (remaining <= 0) {
      reason = "timeout";
    } else {
      const info = getPresence(m.id)?.get(seatToMove);
      if (info?.disconnectedAt && now - info.disconnectedAt > DISCONNECT_TIMEOUT_MS) {
        reason = "disconnect";
      }
    }

    if (reason) {
      const winnerSeat = m.players.find((p) => p.seat !== seatToMove)?.seat ?? null;
      await finalizeMatch(m.id, winnerSeat, reason);
    }
  }
}
