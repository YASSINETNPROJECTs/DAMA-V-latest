// In-memory matchmaking queue (single Node process — documented limitation,
// migration path: move tickets to Redis/Postgres when scaling horizontally).
//
// Phase 7: before a staked match is created, BOTH players' stakes are
// reserved atomically (escrow). Reserved funds cannot be withdrawn or used
// in another match, which prevents double-spending by construction.

import { prisma } from "@/lib/prisma";
import { competitiveConfig } from "@/config/competitive";
import { initialBoard } from "@/features/game/engine";
import { getAvailableBalance, getDefaultCurrency, reserveFundsTx, FinanceError } from "@/features/finance/service";

export class QueueError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "QueueError";
  }
}

interface QueueTicket {
  userId: string;
  stake: number;
  joinedAt: number;
  rating: number;
  level: number;
  xp: number;
}

const g = globalThis as unknown as {
  __damaQueue?: Map<string, QueueTicket>;
  __damaPairings?: Map<string, string>;
};

function queue(): Map<string, QueueTicket> {
  if (!g.__damaQueue) g.__damaQueue = new Map();
  return g.__damaQueue;
}

function pairings(): Map<string, string> {
  if (!g.__damaPairings) g.__damaPairings = new Map();
  return g.__damaPairings;
}

export function currentWindow(waitSec: number) {
  const c = competitiveConfig.matchmaking;
  const steps = Math.floor(Math.max(0, waitSec) / c.stepSeconds);
  return {
    ratingWindow: Math.min(c.initialRatingWindow + steps * c.windowGrowthPerStep, c.maxRatingWindow),
    levelGap: Math.min(c.initialLevelGap + steps, c.maxLevelGap),
    xpGap: Math.min(c.initialXpGap + steps * c.xpGrowthPerStep, c.maxXpGap),
  };
}

export function fairnessCapBreached(a: number, b: number): boolean {
  return Math.abs(a - b) > competitiveConfig.matchmaking.fairnessCap;
}

function isEligible(me: QueueTicket, other: QueueTicket, w: ReturnType<typeof currentWindow>): boolean {
  if (other.stake !== me.stake) return false; // exact stake first, always
  if (fairnessCapBreached(me.rating, other.rating)) return false;
  if (Math.abs(me.rating - other.rating) > w.ratingWindow) return false;
  if (Math.abs(me.level - other.level) > w.levelGap) return false;
  if (Math.abs(me.xp - other.xp) > w.xpGap) return false;
  return true;
}

async function tryPair(userId: string): Promise<
  { status: "searching"; waitSec: number; window: ReturnType<typeof currentWindow> } | { status: "matched"; matchId: string }
> {
  const me = queue().get(userId);
  if (!me) return { status: "searching", waitSec: 0, window: currentWindow(0) };

  const now = Date.now();
  if (now - me.joinedAt > competitiveConfig.matchmaking.ticketTtlSec * 1000) {
    queue().delete(userId);
    return { status: "searching", waitSec: 0, window: currentWindow(0) };
  }

  const waitSec = (now - me.joinedAt) / 1000;
  const w = currentWindow(waitSec);

  let best: QueueTicket | null = null;
  let bestDiff = Infinity;
  for (const t of Array.from(queue().values())) {
    
    if (t.userId === userId) continue;
    if (!isEligible(me, t, w)) continue;
    const diff = Math.abs(t.rating - me.rating);
    if (diff < bestDiff) {
      best = t;
      bestDiff = diff;
    }
  }

  if (!best) return { status: "searching", waitSec: Math.round(waitSec), window: w };

  const currency = await getDefaultCurrency();

  // Pre-flight balance check for the candidate (self was checked at join).
  if (me.stake > 0) {
    const candidateAvailable = await getAvailableBalance(best.userId, currency);
    if (candidateAvailable < me.stake) {
      queue().delete(best.userId); // broke player — drop their ticket
      return { status: "searching", waitSec: Math.round(waitSec), window: w };
    }
  }

  // Create the match and both escrow reservations in ONE database transaction.
  // If either reservation fails, the match creation and the first reservation
  // roll back together; no orphaned reservation can remain.
  let match;
  try {
    match = await prisma.$transaction(async (tx) => {
      const created = await tx.match.create({
        data: {
          mode: "RATED",
          stake: me.stake,
          currency,
          players: {
            create: [
              { userId: me.userId, seat: 0, color: "WHITE", isEngine: false },
              { userId: best.userId, seat: 1, color: "BLACK", isEngine: false },
            ],
          },
          state: {
            create: { board: initialBoard() as unknown as number[], turn: "WHITE", status: "ACTIVE" },
          },
        },
      });

      if (me.stake > 0) {
        // Lock in deterministic order to reduce deadlock risk.
        const first = [me.userId, best.userId].sort()[0];
        const second = first === me.userId ? best.userId : me.userId;
        await reserveFundsTx(tx, first, currency, me.stake, "MATCH_STAKE_RESERVE", created.id);
        await reserveFundsTx(tx, second, currency, me.stake, "MATCH_STAKE_RESERVE", created.id);
      }
      return created;
    });
  } catch (e) {
    queue().delete(me.userId);
    queue().delete(best.userId);
    if (e instanceof FinanceError) throw new QueueError(e.status, e.code, e.message);
    throw e;
  }

  queue().delete(me.userId);
  queue().delete(best.userId);
  pairings().set(me.userId, match.id);
  pairings().set(best.userId, match.id);

  await prisma.auditLog.create({
    data: {
      action: "MATCHMAKING_PAIRED",
      meta: { matchId: match.id, stake: me.stake, currency, ratingGap: bestDiff, escrowed: me.stake > 0 },
    },
  });

  return { status: "matched", matchId: match.id };
}

export async function joinQueue(
  userId: string,
  stake: number
): Promise<{ status: "searching"; waitSec: number; window: ReturnType<typeof currentWindow> } | { status: "matched"; matchId: string }> {
  if (!(competitiveConfig.stakes as readonly number[]).includes(stake)) {
    throw new QueueError(400, "BAD_STAKE", "Pick a stake from the configured options.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new QueueError(404, "NOT_FOUND", "User not found.");

  // Available-balance gate (reserved funds cannot be staked).
  if (stake > 0) {
    const currency = await getDefaultCurrency();
    const available = await getAvailableBalance(userId, currency);
    if (available < stake) {
      throw new QueueError(402, "INSUFFICIENT_FUNDS", "Not enough available balance for that stake.");
    }
  }

  queue().set(userId, {
    userId,
    stake,
    joinedAt: Date.now(),
    rating: user.rating,
    level: user.level,
    xp: user.xp,
  });

  return tryPair(userId);
}

export function leaveQueue(userId: string): void {
  queue().delete(userId);
}

export async function queueStatus(userId: string): Promise<
  | { status: "idle" }
  | { status: "searching"; waitSec: number; window: ReturnType<typeof currentWindow> }
  | { status: "matched"; matchId: string }
> {
  const pending = pairings().get(userId);
  if (pending) {
    pairings().delete(userId);
    return { status: "matched", matchId: pending };
  }
  if (!queue().has(userId)) return { status: "idle" };
  return tryPair(userId);
}
