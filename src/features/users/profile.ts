import { prisma } from "@/lib/prisma";
import type { PublicUser } from "@/types";

export interface ProfileData extends PublicUser {
  displayName: string | null;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    matchesPlayed: number;
    winStreak: number;
    bestStreak: number;
  } | null;
  ratingState: {
    currentRating: number;
    peakRating: number;
    gamesRated: number;
  } | null;
}

/** Full profile for the signed-in user (dashboard / profile / settings pages). */
export async function getProfile(userId: string): Promise<ProfileData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, stats: true, ratingState: true },
  });
  if (!user) return null;

  const { passwordHash: _pw, profile, stats, ratingState, ...rest } = user;

  return {
    ...rest,
    displayName: profile?.displayName ?? null,
    stats: stats
      ? {
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          matchesPlayed: stats.matchesPlayed,
          winStreak: stats.winStreak,
          bestStreak: stats.bestStreak,
        }
      : null,
    ratingState: ratingState
      ? {
          currentRating: ratingState.currentRating,
          peakRating: ratingState.peakRating,
          gamesRated: ratingState.gamesRated,
        }
      : null,
  };
}
