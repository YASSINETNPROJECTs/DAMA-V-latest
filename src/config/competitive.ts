// Competitive loop configuration — DEMO only.
// All stakes are DEMO units, never real cash. No crypto keys anywhere.

export const competitiveConfig = {
  /** Every player starts at 1000 (mirrors appConfig.startingRating). */
  startingRating: 1000,

  /** Elo K-factor. */
  eloK: 32,

  /** Stake tiers in DEMO units — the ONLY source of stake options. */
  stakes: [0, 5, 10, 25, 50] as const,

  /** Platform fee on the pot (both stakes combined). */
  feePercent: 5,

  /** Simulated starting balance in DEMO units (created lazily per user). */
  startingBalance: 1000,

  /** XP rewards per finished competitive match. */
  xp: { win: 50, loss: 20, draw: 30 } as const,

  matchmaking: {
    /** Rating window around your rating that grows while you wait. */
    initialRatingWindow: 100,
    windowGrowthPerStep: 50,
    stepSeconds: 10,
    maxRatingWindow: 400,

    /** Level and experience gaps — also expand with wait time. */
    initialLevelGap: 2,
    maxLevelGap: 10,
    initialXpGap: 500,
    xpGrowthPerStep: 500,
    maxXpGap: 5000,

    /** Fairness cap: never pair players more than this far apart, whatever the wait. */
    fairnessCap: 350,

    /** Tickets expire after this long (seconds). */
    ticketTtlSec: 600,
  },
} as const;
