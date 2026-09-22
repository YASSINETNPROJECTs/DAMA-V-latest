// Idempotent competitive match settlement (RATED mode).
// Phase 7: stakes are ESCROWED (reserved) when the match is created by the
// matchmaker. Here, at match end, the escrow is settled exactly once:
//   - winner: reserved −stake, balance +(payout − stake)  → net +payout−stake
//   - loser:  reserved −stake, balance −stake             → net −stake
//   - draw:   both reserves released (refund)
//   - platform fee recorded in PlatformRevenue (separate from player funds)
// Concurrency: atomic settledAt claim + wallet row locks (FOR UPDATE).

import { prisma } from "@/lib/prisma";
import { competitiveConfig } from "@/config/competitive";
import { getFeePercent } from "@/features/admin/settings";
import { planSettlement, type SettlementPlan } from "@/features/finance/logic";
import { settleMatchEscrowTx } from "@/features/finance/service";
import { levelForXp, newRatings } from "./elo";

export type SettlementVerdict = "ACTIVE" | "READY" | "ALREADY_SETTLED" | "NOT_RATED";

/** Pure guard — the heart of the double-settlement protection. */
export function settlementVerdict(match: {
  mode: string;
  status: string;
  settledAt: Date | null;
}): SettlementVerdict {
  if (match.mode !== "RATED") return "NOT_RATED";
  if (match.settledAt) return "ALREADY_SETTLED";
  if (match.status === "ACTIVE") return "ACTIVE";
  return "READY";
}

/** Kept for compatibility (match history page + tests). Same as planSettlement. */
export function planStake(stake: number, feePercent = competitiveConfig.feePercent): SettlementPlan {
  return planSettlement(stake, feePercent);
}

/**
 * Settle a finished RATED match exactly once. Claims settledAt atomically;
 * a second call — even racing the first — returns "skipped" without paying twice.
 */
export async function settleMatchIfNeeded(matchId: string): Promise<"settled" | "skipped"> {
  const feePercent = await getFeePercent();

  return prisma.$transaction(async (tx) => {
    // The claim lives in the SAME transaction as the financial settlement.
    // If anything below fails, settledAt rolls back and a safe retry remains possible.
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { players: true, state: true },
    });
    if (!match || !match.state) return "skipped";
    if (settlementVerdict(match) !== "READY") return "skipped";

    const seats = match.players.filter((p) => p.userId !== null);
    if (seats.length !== 2) return "skipped";

    const claim = await tx.match.updateMany({
      where: { id: matchId, settledAt: null },
      data: { settledAt: new Date() },
    });
    if (claim.count === 0) return "skipped";

    const draw = match.state.status !== "FINISHED" || match.state.winnerSeat === null;
    const stake = match.stake;
    const currency = match.currency;
    const plan = planSettlement(stake, feePercent);

    const [p0, p1] = seats;
    const rs0 = await tx.ratingState.upsert({
      where: { userId: p0.userId! },
      update: {},
      create: { userId: p0.userId!, currentRating: competitiveConfig.startingRating },
    });
    const rs1 = await tx.ratingState.upsert({
      where: { userId: p1.userId! },
      update: {},
      create: { userId: p1.userId!, currentRating: competitiveConfig.startingRating },
    });

    const score0 = draw ? 0.5 : match.state.winnerSeat === p0.seat ? 1 : 0;
    const elo = newRatings(rs0.currentRating, rs1.currentRating, score0, competitiveConfig.eloK);

    for (const [idx, p] of Array.from(seats.entries())) {
      const score = idx === 0 ? score0 : 1 - score0;
      const newRating = idx === 0 ? elo.a : elo.b;
      const delta = idx === 0 ? elo.deltaA : elo.deltaB;
      const prevRs = idx === 0 ? rs0 : rs1;

      const user = await tx.user.findUniqueOrThrow({ where: { id: p.userId! } });
      const xpGain = draw
        ? competitiveConfig.xp.draw
        : score === 1
          ? competitiveConfig.xp.win
          : competitiveConfig.xp.loss;
      const newXp = user.xp + xpGain;

      await tx.user.update({
        where: { id: user.id },
        data: { rating: newRating, xp: newXp, level: levelForXp(newXp) },
      });
      await tx.ratingState.update({
        where: { userId: user.id },
        data: {
          currentRating: newRating,
          peakRating: Math.max(prevRs.peakRating, newRating),
          gamesRated: prevRs.gamesRated + 1,
          lastChange: delta,
        },
      });

      const win = !draw && score === 1;
      const prev = await tx.playerStats.findUnique({ where: { userId: user.id } });
      const stats = {
        wins: (prev?.wins ?? 0) + (win ? 1 : 0),
        losses: (prev?.losses ?? 0) + (!draw && score === 0 ? 1 : 0),
        draws: (prev?.draws ?? 0) + (draw ? 1 : 0),
        matchesPlayed: (prev?.matchesPlayed ?? 0) + 1,
        winStreak: win ? (prev?.winStreak ?? 0) + 1 : 0,
        bestStreak: Math.max(prev?.bestStreak ?? 0, win ? (prev?.winStreak ?? 0) + 1 : 0),
      };
      await tx.playerStats.upsert({
        where: { userId: user.id },
        update: stats,
        create: { userId: user.id, ...stats },
      });
    }

    await settleMatchEscrowTx(tx, {
      matchId,
      currency,
      stake,
      fee: plan.fee,
      winnerUserId: draw ? null : seats.find((p) => p.seat === match.state!.winnerSeat)!.userId!,
      playerUserIds: [p0.userId!, p1.userId!],
    });

    await tx.auditLog.create({
      data: {
        action: "MATCH_SETTLED",
        meta: { matchId, stake, currency, draw, fee: plan.fee, automated: true },
      },
    });

    return "settled";
  });
}

