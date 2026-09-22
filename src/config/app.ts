// Central application configuration for DAMA Phase 1.
// Values that must change per environment come from env vars with safe defaults.

export const appConfig = {
  name: "DAMA",
  tagline: "Competitive Checkers, Elevated.",

  /** DEMO_MODE=true runs the app with seeded demo data and no real money. */
  demoMode: process.env.DEMO_MODE !== "false",

  /** Real-money staking. HARD DISABLED in Phase 1 — no wallet exists yet. */
  realMoneyEnabled: process.env.REAL_MONEY_ENABLED === "true",

  /** Every new player starts here (used at registration). */
  startingRating: 1000,

  /** Stake tiers in USD reserved for the wallet phase. Unused in Phase 1. */
  stakeOptions: [0, 5, 10, 25, 50] as const,

  /** Platform fee percent reserved for the wallet phase. Unused in Phase 1. */
  feePercent: 5,

  /** Session lifetime in days. */
  sessionDays: 30,
} as const;

export type AppConfig = typeof appConfig;
