// Engine rule tests. Run with: npm test
// Covers: legal, illegal, capture (mandatory), multi-capture, promotion, win, draw, wrong turn.

import { describe, expect, it } from "vitest";
import {
  applyMove,
  BLACK_MAN,
  BLACK_KING,
  emptyBoard,
  getLegalMoves,
  initialBoard,
  resolveStatus,
  validateMove,
  WHITE_KING,
  WHITE_MAN,
  type Piece,
} from "./engine";

/** Board with WHITE_MAN by default; overrides set other pieces. */
function setup(pieces: Record<number, Piece>): Piece[] {
  const b = emptyBoard();
  for (const [sq, p] of Object.entries(pieces)) b[Number(sq)] = p;
  return b;
}

describe("legal moves", () => {
  it("allows a normal forward diagonal move", () => {
    const board = initialBoard();
    // White man on 51 (r6,c3) can step to 42 (r5,c2).
    const result = validateMove(board, "WHITE", 51, [42]);
    expect(result.ok).toBe(true);
  });

  it("generates exactly 7 legal opening moves for White", () => {
    expect(getLegalMoves(initialBoard(), "WHITE")).toHaveLength(7);
    expect(getLegalMoves(initialBoard(), "BLACK")).toHaveLength(7);
  });
});

describe("illegal moves", () => {
  it("rejects a backward move", () => {
    const board = setup({ 51: WHITE_MAN });
    const result = validateMove(board, "WHITE", 51, [60]); // r6c3 -> r7c4, backwards
    expect(result).toMatchObject({ ok: false, code: "ILLEGAL_MOVE" });
  });

  it("rejects a move onto a light (unplayable) square", () => {
    const board = setup({ 51: WHITE_MAN });
    const result = validateMove(board, "WHITE", 51, [43]); // r5c3 is light
    expect(result).toMatchObject({ ok: false, code: "ILLEGAL_MOVE" });
  });

  it("rejects a move onto an occupied square", () => {
    const board = setup({ 51: WHITE_MAN, 42: WHITE_MAN });
    const result = validateMove(board, "WHITE", 51, [42]);
    expect(result).toMatchObject({ ok: false, code: "ILLEGAL_MOVE" });
  });

  it("rejects moving from an empty square", () => {
    const board = emptyBoard();
    const result = validateMove(board, "WHITE", 30, [21]);
    expect(result).toMatchObject({ ok: false, code: "NO_PIECE" });
  });
});

describe("mandatory capture", () => {
  it("rejects a quiet move when a capture is available", () => {
    // White 42 (r5c2) can jump black 35 (r4c3) landing on 28 (r3c4).
    const board = setup({ 42: WHITE_MAN, 35: BLACK_MAN, 46: WHITE_MAN });
    const quiet = validateMove(board, "WHITE", 46, [37]);
    expect(quiet).toMatchObject({ ok: false, code: "CAPTURE_REQUIRED" });

    const capture = validateMove(board, "WHITE", 42, [28]);
    expect(capture.ok).toBe(true);
    if (capture.ok) expect(capture.move.captured).toEqual([35]);
  });
});

describe("multi-capture", () => {
  // White man 46 jumps black 39 -> 30, then must jump black 21 -> 14.
  const board = setup({ 46: WHITE_MAN, 39: BLACK_MAN, 21: BLACK_MAN });

  it("rejects an incomplete jump sequence", () => {
    const result = validateMove(board, "WHITE", 46, [30]);
    expect(result).toMatchObject({ ok: false, code: "MUST_CONTINUE" });
  });

  it("accepts the full jump sequence and captures both pieces", () => {
    const result = validateMove(board, "WHITE", 46, [30, 14]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.move.captured).toEqual([39, 21]);

    const after = applyMove(board, result.move);
    expect(after[14]).toBe(WHITE_MAN);
    expect(after[39]).toBe(0);
    expect(after[21]).toBe(0);
    expect(after[46]).toBe(0);
  });
});

describe("promotion", () => {
  it("crowns a man that captures into the last row and ends the move", () => {
    // White man 17 jumps black 10 -> lands on row 0.
    const board = setup({ 17: WHITE_MAN, 10: BLACK_MAN });
    const result = validateMove(board, "WHITE", 17, [3]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.move.promotion).toBe(true);
    const after = applyMove(board, result.move);
    expect(after[3]).toBe(WHITE_KING);
    expect(after[10]).toBe(0);
  });

  it("crowns a man on a quiet move reaching the last row", () => {
    const board = setup({ 11: WHITE_MAN }); // r1c3 -> r0c2
    const result = validateMove(board, "WHITE", 11, [2]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.move.promotion).toBe(true);
    expect(applyMove(board, result.move)[2]).toBe(WHITE_KING);
  });

  it("lets a king move backwards after promotion", () => {
    const board = setup({ 2: WHITE_KING, 20: BLACK_MAN });
    // King on 2 (r0c2) moves backwards to 11 (r1c3).
    const result = validateMove(board, "WHITE", 2, [11]);
    expect(result.ok).toBe(true);
  });
});

describe("win detection", () => {
  it("declares the winner when the opponent has no pieces left", () => {
    // White 42 captures black 33 -> black has zero pieces.
    const board = setup({ 42: WHITE_MAN, 33: BLACK_MAN });
    const result = validateMove(board, "WHITE", 42, [24]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = applyMove(board, result.move);
    const verdict = resolveStatus(after, "BLACK", 0);
    expect(verdict).toEqual({ status: "FINISHED", winner: "WHITE" });
  });

  it("declares the winner when the opponent has no legal move", () => {
    // Black man 60 (r7c4) is blocked by white men 51 and 53.
    const board = setup({ 60: BLACK_MAN, 51: WHITE_MAN, 53: WHITE_MAN });
    const verdict = resolveStatus(board, "BLACK", 0);
    expect(verdict).toEqual({ status: "FINISHED", winner: "WHITE" });
  });
});

describe("draw rule", () => {
  it("draws after 40 quiet plies", () => {
    const verdict = resolveStatus(initialBoard(), "WHITE", 40);
    expect(verdict.status).toBe("DRAW");
  });

  it("does not draw below the threshold", () => {
    const verdict = resolveStatus(initialBoard(), "WHITE", 39);
    expect(verdict.status).toBe("ACTIVE");
  });
});

describe("wrong turn", () => {
  it("rejects moving the opponent's piece", () => {
    const board = initialBoard();
    const result = validateMove(board, "WHITE", 10, [17]); // 10 is a black man
    expect(result).toMatchObject({ ok: false, code: "WRONG_TURN" });
  });

  it("rejects a correct-looking move when it is not your turn", () => {
    const board = initialBoard();
    const result = validateMove(board, "BLACK", 51, [42]); // white piece as black
    expect(result).toMatchObject({ ok: false, code: "WRONG_TURN" });
  });
});

describe("king captures both directions", () => {
  it("allows a backward capture for a king", () => {
    // White king 14 (r1c6) jumps black 21 (r2c5) backwards -> 28 (r3c4).
    const board = setup({ 14: WHITE_KING, 21: BLACK_MAN });
    const result = validateMove(board, "WHITE", 14, [28]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.move.captured).toEqual([21]);
  });
});
