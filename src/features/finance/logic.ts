// Pure financial logic — no I/O. Single source of truth for guards & math.
// Used by the financial service AND by unit tests.

export interface SettlementPlan {
  pot: number;
  fee: number;
  winnerPayout: number;
}

/** Pot = 2×stake; winner gets pot − fee; fee goes to platform revenue. */
export function planSettlement(stake: number, feePercent: number): SettlementPlan {
  const pot = stake * 2;
  const fee = Math.floor((pot * Math.min(50, Math.max(0, Math.round(feePercent)))) / 100);
  return { pot, fee, winnerPayout: pot - fee };
}

/** Available = total − reserved. Never negative. */
export function availableBalance(balance: number, reserved: number): number {
  return Math.max(0, balance - Math.max(0, reserved));
}

/** Can `amount` be reserved without double-spending? */
export function canReserve(balance: number, reserved: number, amount: number): boolean {
  return Number.isInteger(amount) && amount > 0 && balance - reserved >= amount;
}

export function withdrawalInputError(input: {
  amount: number;
  available: number;
  minWithdrawal: number;
}): string | null {
  const { amount, available, minWithdrawal } = input;
  if (!Number.isInteger(amount) || amount <= 0) return "Enter a valid whole-unit amount.";
  if (amount < minWithdrawal) return `Minimum withdrawal is ${minWithdrawal}.`;
  if (amount > available) return "Insufficient available balance.";
  return null;
}

export function depositInputError(input: {
  amount: number;
  minDeposit: number;
}): string | null {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return "Enter a valid whole-unit amount.";
  if (input.amount < input.minDeposit) return `Minimum deposit is ${input.minDeposit}.`;
  return null;
}

export type DepositAction = "APPROVE" | "REJECT" | "CANCEL";
export function depositTransitionAllowed(action: DepositAction, status: string): boolean {
  if (action === "APPROVE" || action === "REJECT") return status === "PENDING";
  return status === "PENDING"; // CANCEL (owner only — enforced in service)
}

export type WithdrawalAction = "PROCESS" | "COMPLETE" | "REJECT" | "CANCEL";
export function withdrawalTransitionAllowed(action: WithdrawalAction, status: string): boolean {
  switch (action) {
    case "PROCESS":
      return status === "PENDING";
    case "COMPLETE":
      return status === "PROCESSING";
    case "REJECT":
    case "CANCEL":
      return status === "PENDING" || status === "PROCESSING";
  }
}

/** Server-side role gate — financial admin APIs never trust the client. */
export function canManageFinances(role: string): boolean {
  return role === "ADMIN";
}

/** Basic destination sanity check (no chain-specific validation at this stage). */
export function validDestinationAddress(address: string): boolean {
  const a = address.trim();
  return a.length >= 10 && a.length <= 128 && !/\s/.test(a);
}
