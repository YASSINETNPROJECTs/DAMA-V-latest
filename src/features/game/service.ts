// Server-side game service: DB loading, validation orchestration, persistence.
// The API routes stay thin; ALL rules run here / in engine.ts. Never trust the client.

import { prisma } from "@/lib/prisma";
import {
  applyMove,
  initialBoard,
  resolveStatus,
  toNotation,
  validateMove,
  type Move,
  type Piece,
  type PlayerColor,
} from "./engine";
import { chooseEngineMove } from "./ai";

export class GameError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "GameError";
  }
}

export interface MoveView {
  notation: string;
  seat: number;
}

export interface StateView {
  board: number[];
  turn: PlayerColor;
  status: string;
  winnerSeat: number | null;
  quietPlies: number;
  moveNumber: number;
}

export interface MatchView {
  matchId: string;
  youSeat: number;
  youColor: PlayerColor;
  opponentName: string;
  state: StateView;
  moves: MoveView[];
}

/** Persist one ply: move record + updated game state (+ match status if ended). */
async function applyOne(
  matchId: string,
  seat: number,
  color: PlayerColor,
  move: Move
): Promise<void> {
  const state = await prisma.gameState.findUnique({ where: { matchId } });
  if (!state) throw new GameError(404, "NOT_FOUND", "Game state not found.");
  if (state.status !== "ACTIVE") return; // already over

  const board = state.board as unknown as Piece[];
  const boardAfter = applyMove(board, move);
  const quietPlies =
    move.captured.length > 0 || move.promotion ? 0 : state.quietPlies + 1;

  const verdict = resolveStatus(boardAfter, color === "WHITE" ? "BLACK" : "WHITE", quietPlies);

  await prisma.move.create({
    data: {
      matchId,
      moveNumber: state.moveNumber,
      seat,
      from: move.from,
      path: move.path,
      captured: move.captured,
      notation: toNotation(move),
    },
  });

  const newStatus = verdict.status === "ACTIVE" ? "ACTIVE" : verdict.status;
  await prisma.gameState.update({
    where: { id: state.id },
    data: {
      board: boardAfter as unknown as number[],
      turn: color === "WHITE" ? "BLACK" : "WHITE",
      status: newStatus,
      winnerSeat: verdict.winner ? (verdict.winner === "WHITE" ? 0 : 1) : null,
      quietPlies,
      moveNumber: state.moveNumber + 1,
    },
  });

  if (newStatus !== "ACTIVE") {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: newStatus },
    });
  }
}

/** If the side to move is an engine seat, let it play immediately (same request). */
async function maybeEngineReply(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: true, state: true },
  });
  if (!match || !match.state || match.state.status !== "ACTIVE") return;
  const engine = match.players.find((p) => p.color === match.state!.turn && p.isEngine);
  if (!engine) return;

  const move = chooseEngineMove(
    match.state.board as unknown as Piece[],
    engine.color as PlayerColor
  );
  if (!move) return;
  await applyOne(match.id, engine.seat, engine.color as PlayerColor, move);
}

async function buildView(matchId: string, youSeat: number): Promise<MatchView> {
  const match = await prisma.match.findUniqueOrThrow({
    where: { id: matchId },
    include: { players: true, state: true },
  });
  const me = match.players.find((p) => p.seat === youSeat);
  if (!me || !match.state) throw new GameError(404, "NOT_FOUND", "Match not found.");
  const engine = match.players.find((p) => p.isEngine);

  const moves = await prisma.move.findMany({
    where: { matchId },
    orderBy: { moveNumber: "asc" },
    take: 60,
    select: { notation: true, seat: true },
  });

  return {
    matchId: match.id,
    youSeat: me.seat,
    youColor: me.color as PlayerColor,
    opponentName: engine ? "Engine" : "Opponent",
    state: {
      board: match.state.board,
      turn: match.state.turn as PlayerColor,
      status: match.state.status,
      winnerSeat: match.state.winnerSeat,
      quietPlies: match.state.quietPlies,
      moveNumber: match.state.moveNumber,
    },
    moves,
  };
}

/** Create a TEST match: the human is WHITE (seat 0), an engine dummy is BLACK (seat 1). */
export async function createTestMatch(userId: string): Promise<MatchView> {
  const match = await prisma.match.create({
    data: {
      mode: "TEST",
      players: {
        create: [
          { userId, seat: 0, color: "WHITE", isEngine: false },
          { seat: 1, color: "BLACK", isEngine: true },
        ],
      },
      state: {
        create: {
          board: initialBoard() as unknown as number[],
          turn: "WHITE",
          status: "ACTIVE",
        },
      },
    },
  });
  return buildView(match.id, 0);
}

/**
 * Submit a move as the human player. Validates server-side, applies the human
 * ply, then (if the game continues) lets the engine seat reply in the same call.
 */
export async function submitMove(
  matchId: string,
  userId: string,
  from: number,
  path: number[]
): Promise<MatchView> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: true, state: true },
  });
  if (!match || !match.state) throw new GameError(404, "NOT_FOUND", "Match not found.");
  if (match.status !== "ACTIVE" || match.state.status !== "ACTIVE") {
    throw new GameError(409, "GAME_OVER", "This game is already over.");
  }

  const me = match.players.find((p) => p.userId === userId);
  if (!me) throw new GameError(403, "FORBIDDEN", "You are not a player in this match.");
  if (me.isEngine) throw new GameError(403, "FORBIDDEN", "Engine seats cannot move via the API.");
  if (match.state.turn !== me.color) {
    throw new GameError(409, "WRONG_TURN", "It is not your turn.");
  }

  const board = match.state.board as unknown as Piece[];
  const result = validateMove(board, me.color as PlayerColor, from, path);
  if (!result.ok) throw new GameError(422, result.code, result.error);

  await applyOne(match.id, me.seat, me.color as PlayerColor, result.move);
  await maybeEngineReply(match.id);

  return buildView(match.id, me.seat);
}
