// Pure Elo math + level curve. Server-side only.
// Phase 5 FIX: newRatings() previously computed B's new rating from A's
// rating (a: aRating + deltaA, b: aRating + deltaB). Corrected below.

export function expectedScore(myRating: number, oppRating: number): number {
  return 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
}

/** Signed rating change for `score` (1 win, 0.5 draw, 0 loss). */
export function eloDelta(myRating: number, oppRating: number, score: number, k = 32): number {
  return Math.round(k * (score - expectedScore(myRating, oppRating)));
}

/** Both new ratings + deltas from player A's score. Zero-sum (±1 rounding). */
export function newRatings(
  aRating: number,
  bRating: number,
  scoreA: number,
  k = 32
): { a: number; b: number; deltaA: number; deltaB: number } {
  const deltaA = eloDelta(aRating, bRating, scoreA, k);
  const deltaB = eloDelta(bRating, aRating, 1 - scoreA, k);
  return { a: aRating + deltaA, b: bRating + deltaB, deltaA, deltaB };
}

/** Level from total XP: level n needs 100*(n-1)^2 XP. Level 1 at 0 XP. */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}
