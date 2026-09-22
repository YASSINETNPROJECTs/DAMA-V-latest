// Settlement + Elo unit tests. Run with: npm test

import { describe, expect, it } from "vitest";
import { eloDelta, expectedScore, levelForXp, newRatings } from "./elo";
import { planStake, settlementVerdict } from "./settle";

describe("elo", () => {
  it("expects 50% between equal players", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
  });

  it("favours the higher-rated player", () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });

  it("rewards beating a stronger opponent more", () => {
    const upset = eloDelta(1000, 1200, 1);
    const favourite = eloDelta(1000, 800, 1);
    expect(upset).toBeGreaterThan(favourite);
    expect(upset).toBeGreaterThan(0);
  });

  it("is zero-sum across both players", () => {
    const { deltaA, deltaB } = newRatings(1100, 900, 1);
    expect(deltaA + deltaB).toBeLessThanOrEqual(1);
    expect(deltaA + deltaB).toBeGreaterThanOrEqual(-1);
  });

  it("computes both new ratings from their own base (phase 5 regression)", () => {
    const { a, b, deltaA, deltaB } = newRatings(1100, 900, 1);
    expect(a).toBe(1100 + deltaA);
    expect(b).toBe(900 + deltaB); // was wrongly 1100 + deltaB before the fix
  });
});

describe("levels", () => {
  it("maps xp to levels (level n needs 100*(n-1)^2 xp)", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(399)).toBe(2);
    expect(levelForXp(400)).toBe(3);
  });
});

describe("stake plan", () => {
  it("splits pot minus fee for the winner", () => {
    expect(planStake(10, 5)).toEqual({ pot: 20, fee: 1, winnerPayout: 19 });
  });

  it("free games move no money", () => {
    expect(planStake(0, 5)).toEqual({ pot: 0, fee: 0, winnerPayout: 0 });
  });
});

describe("settlement idempotency guard", () => {
  const finished = { mode: "RATED", status: "FINISHED", settledAt: null };

  it("settles a fresh finished rated match", () => {
    expect(settlementVerdict(finished)).toBe("READY");
  });

  it("does NOT settle twice (double-settlement protection)", () => {
    expect(settlementVerdict(finished)).toBe("READY");
    const settled = { ...finished, settledAt: new Date() };
    expect(settlementVerdict(settled)).toBe("ALREADY_SETTLED");
  });

  it("waits while the match is still active", () => {
    expect(settlementVerdict({ ...finished, status: "ACTIVE" })).toBe("ACTIVE");
  });

  it("ignores non-rated modes", () => {
    expect(settlementVerdict({ mode: "DEMO", status: "FINISHED", settledAt: null })).toBe("NOT_RATED");
  });
});
