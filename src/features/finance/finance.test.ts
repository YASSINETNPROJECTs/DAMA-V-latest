// Financial logic unit tests (pure — no database). Run with: npm test

import { describe, expect, it } from "vitest";
import {
  availableBalance,
  canManageFinances,
  canReserve,
  depositInputError,
  depositTransitionAllowed,
  planSettlement,
  validDestinationAddress,
  withdrawalInputError,
  withdrawalTransitionAllowed,
} from "./logic";

describe("settlement math", () => {
  it("splits pot minus fee for the winner", () => {
    expect(planSettlement(10, 5)).toEqual({ pot: 20, fee: 1, winnerPayout: 19 });
  });
  it("clamps fee percent to 0-50", () => {
    expect(planSettlement(10, 95).fee).toBe(10);
    expect(planSettlement(10, -5).fee).toBe(0);
  });
  it("free games move no money", () => {
    expect(planSettlement(0, 5)).toEqual({ pot: 0, fee: 0, winnerPayout: 0 });
  });

  it("never allows a negative effective payout", () => {
    const plan = planSettlement(10, 50);
    expect(plan.pot).toBe(20);
    expect(plan.fee).toBe(10);
    expect(plan.winnerPayout).toBe(10);
  });
});

describe("available / reserved accounting", () => {
  it("available = total − reserved", () => {
    expect(availableBalance(100, 60)).toBe(40);
    expect(availableBalance(50, 80)).toBe(0); // never negative
  });
  it("reserve guard prevents double-spending", () => {
    expect(canReserve(100, 0, 60)).toBe(true);
    expect(canReserve(100, 60, 60)).toBe(false); // reserved funds can't be re-spent
    expect(canReserve(100, 100, 1)).toBe(false);
    expect(canReserve(100, 0, 0)).toBe(false);
    expect(canReserve(100, 0, 5.5)).toBe(false); // integers only
  });
});

describe("withdrawal input validation", () => {
  it("accepts a valid request", () => {
    expect(withdrawalInputError({ amount: 20, available: 100, minWithdrawal: 10 })).toBeNull();
  });
  it("rejects insufficient, below-min and invalid amounts", () => {
    expect(withdrawalInputError({ amount: 60, available: 40, minWithdrawal: 10 })).toMatch(/Insufficient/);
    expect(withdrawalInputError({ amount: 5, available: 100, minWithdrawal: 10 })).toMatch(/Minimum/);
    expect(withdrawalInputError({ amount: -3, available: 100, minWithdrawal: 10 })).toMatch(/valid/);
    expect(withdrawalInputError({ amount: 2.5, available: 100, minWithdrawal: 1 })).toMatch(/valid/);
  });
});

describe("deposit input validation", () => {
  it("enforces minimum deposit and integers", () => {
    expect(depositInputError({ amount: 3, minDeposit: 5 })).toMatch(/Minimum/);
    expect(depositInputError({ amount: 5, minDeposit: 5 })).toBeNull();
  });
});

describe("state machine guards (idempotency)", () => {
  it("deposits: approve/reject only from PENDING", () => {
    expect(depositTransitionAllowed("APPROVE", "PENDING")).toBe(true);
    expect(depositTransitionAllowed("APPROVE", "APPROVED")).toBe(false); // double-approval blocked
    expect(depositTransitionAllowed("REJECT", "REJECTED")).toBe(false);
    expect(depositTransitionAllowed("CANCEL", "PENDING")).toBe(true);
  });
  it("withdrawals: PENDING → PROCESSING → COMPLETED; reject releases", () => {
    expect(withdrawalTransitionAllowed("PROCESS", "PENDING")).toBe(true);
    expect(withdrawalTransitionAllowed("COMPLETE", "PENDING")).toBe(false);
    expect(withdrawalTransitionAllowed("COMPLETE", "COMPLETED")).toBe(false); // retry safe
    expect(withdrawalTransitionAllowed("REJECT", "PROCESSING")).toBe(true);
    expect(withdrawalTransitionAllowed("CANCEL", "PENDING")).toBe(true);
  });
});

describe("authorization + addresses", () => {
  it("only ADMIN can manage finances", () => {
    expect(canManageFinances("ADMIN")).toBe(true);
    expect(canManageFinances("PLAYER")).toBe(false);
    expect(canManageFinances("MODERATOR")).toBe(false);
  });
  it("destination address sanity", () => {
    expect(validDestinationAddress("TXXXXXXXXXXXXXXXXXXXX")).toBe(true);
    expect(validDestinationAddress("0xabc123def456abc123def456abc123def456abcd")).toBe(true);
    expect(validDestinationAddress("short")).toBe(false);
    expect(validDestinationAddress("has space123456")).toBe(false);
  });
});
