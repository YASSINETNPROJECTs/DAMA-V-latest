// ============================================================
// DEMO PROVIDER ADAPTERS — ALL SIMULATED, NONE OF THIS IS REAL
// ============================================================
// These interfaces define where real providers would plug in (Phase 6+,
// only with proper licensing). The demo implementations below perform NO
// real crypto operations, NO real KYC, and send NO real email.
// REAL_MONEY_ENABLED stays false. There are no wallet keys in this repo.

export interface CryptoProvider {
  readonly name: string;
  readonly isReal: false;
  /** Real providers would return a deposit address. Demo: null. */
  getDepositAddress(): null;
  getNetworkStatus(): "DISABLED";
}

export const demoCryptoProvider: CryptoProvider = {
  name: "DemoCryptoAdapter",
  isReal: false,
  getDepositAddress: () => null,
  getNetworkStatus: () => "DISABLED",
};

export interface KYCProvider {
  readonly name: string;
  readonly isReal: false;
  /** Real providers would open an identity verification session. */
  startVerification(): { status: "PENDING" };
  /** Demo auto-approval. Real providers would send a webhook decision. */
  simulateDecision(): { status: "VERIFIED" };
}

export const demoKycProvider: KYCProvider = {
  name: "SimulatedKYCProvider",
  isReal: false,
  startVerification: () => ({ status: "PENDING" }),
  simulateDecision: () => ({ status: "VERIFIED" }),
};

export interface EmailProvider {
  readonly name: string;
  readonly isReal: false;
  /** Real providers would deliver an email. Demo: only records intent. */
  send(to: string, subject: string): { queued: true; note: string };
}

export const demoEmailProvider: EmailProvider = {
  name: "DemoEmailAdapter",
  isReal: false,
  send: (to, subject) => ({
    queued: true,
    note: `DEMO: would email "${to}" about "${subject}". Nothing was sent.`,
  }),
};
