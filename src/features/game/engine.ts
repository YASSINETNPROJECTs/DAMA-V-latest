// Server-authoritative English draughts (8x8) engine.
// PURE functions only — no I/O, no Prisma, no Next.js imports.
// See RULES.md for the exact rules this module implements.

export const EMPTY = 0;
export const WHITE_MAN = 1;
export const WHITE_KING = 2;
export const BLACK_MAN = 3;
export const BLACK_KING = 4;
export type Piece = 0 | 1 | 2 | 3 | 4;

export type PlayerColor = "WHITE" | "BLACK";
export type GameStatus = "ACTIVE" | "FINISHED" | "DRAW";

export interface Move {
  from: number; // board index 0-63
  path: number[]; // landing squares in order (length 1 = quiet, 2+ = jump sequence)
  captured: number[]; // board indexes of captured pieces
  promotion: boolean; // true if this move crowns a man
}

export type ValidationResult =
  | { ok: true; move: Move }
  | { ok: false; code: string; error: string };

// ---------------------------------------------------------------- helpers

const rowOf = (sq: number) => Math.floor(sq / 8);
const colOf = (sq: number) => sq % 8;
const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const WHITE_DIRS: ReadonlyArray<readonly [number, number]> = [[-1, -1], [-1, 1]];
const BLACK_DIRS: ReadonlyArray<readonly [number, number]> = [[1, -1], [1, 1]];
const KING_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

export function pieceColor(p: Piece): PlayerColor | null {
  if (p === WHITE_MAN || p === WHITE_KING) return "WHITE";
  if (p === BLACK_MAN || p === BLACK_KING) return "BLACK";
  return null;
}

export function isKing(p: Piece): boolean {
  return p === WHITE_KING || p === BLACK_KING;
}

export function otherColor(c: PlayerColor): PlayerColor {
  return c === "WHITE" ? "BLACK" : "WHITE";
}

/** New board with Black on rows 0-2, White on rows 5-7. */
export function initialBoard(): Piece[] {
  const b = new Array<Piece>(64).fill(EMPTY);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r * 8 + c] = BLACK_MAN;
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r * 8 + c] = WHITE_MAN;
  return b;
}

/** Empty board (used by tests and custom setups). */
export function emptyBoard(): Piece[] {
  return new Array<Piece>(64).fill(EMPTY);
}

// ------------------------------------------------------- move generation

function dirsFor(p: Piece): ReadonlyArray<readonly [number, number]> {
  if (isKing(p)) return KING_DIRS;
  return p === WHITE_MAN ? WHITE_DIRS : BLACK_DIRS;
}

/** Single-jump options (over, land) for the piece on `sq`. */
function jumpsFor(board: Piece[], sq: number): { over: number; land: number }[] {
  const p = board[sq];
  const color = pieceColor(p);
  if (!color) return [];
  const r = rowOf(sq);
  const c = colOf(sq);
  const out: { over: number; land: number }[] = [];
  for (const [dr, dc] of dirsFor(p)) {
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (!inBounds(lr, lc)) continue;
    const over = (r + dr) * 8 + (c + dc);
    const land = lr * 8 + lc;
    const victim = board[over];
    if (board[land] === EMPTY && victim !== EMPTY && pieceColor(victim) !== color) {
      out.push({ over, land });
    }
  }
  return out;
}

/**
 * All MAXIMAL jump sequences starting on `sq`. Returns lists of landing squares.
 * A man crowned mid-sequence stops there (English draughts rule).
 * `[[]]` means "no jump available" — callers filter empty sequences out.
 */
function captureSequences(board: Piece[], sq: number): number[][] {
  const p = board[sq];
  const jumps = jumpsFor(board, sq);
  if (jumps.length === 0) return [[]];
  const out: number[][] = [];
  for (const j of jumps) {
    const nb = board.slice() as Piece[];
    nb[j.over] = EMPTY;
    nb[j.land] = p;
    nb[sq] = EMPTY;
    if (p === WHITE_MAN || p === BLACK_MAN) {
      const lastRow = p === WHITE_MAN ? 0 : 7;
      if (rowOf(j.land) === lastRow) {
        out.push([j.land]); // crowning ends the move
        continue;
      }
    }
    for (const rest of captureSequences(nb, j.land)) {
      out.push([j.land, ...rest]);
    }
  }
  return out;
}

/** Diagonally adjacent empty squares (one step). */
function quietTargets(board: Piece[], sq: number): number[] {
  const p = board[sq];
  const r = rowOf(sq);
  const c = colOf(sq);
  const out: number[] = [];
  for (const [dr, dc] of dirsFor(p)) {
    const tr = r + dr;
    const tc = c + dc;
    if (inBounds(tr, tc) && board[tr * 8 + tc] === EMPTY) out.push(tr * 8 + tc);
  }
  return out;
}

function midpoint(a: number, b: number): number | null {
  const ar = rowOf(a);
  const ac = colOf(a);
  const br = rowOf(b);
  const bc = colOf(b);
  if (Math.abs(ar - br) !== 2 || Math.abs(ac - bc) !== 2) return null;
  return ((ar + br) / 2) * 8 + (ac + bc) / 2;
}

/** Squares jumped over along from -> path (works for multi-jumps). */
export function capturedSquares(board: Piece[], from: number, path: number[]): number[] {
  const out: number[] = [];
  let prev = from;
  for (const land of path) {
    const mid = midpoint(prev, land);
    if (mid !== null && board[mid] !== EMPTY) out.push(mid);
    prev = land;
  }
  return out;
}

function willPromote(piece: Piece, land: number): boolean {
  if (piece === WHITE_MAN) return rowOf(land) === 0;
  if (piece === BLACK_MAN) return rowOf(land) === 7;
  return false;
}

/**
 * All legal moves for `player`. If any capture exists, ONLY captures are
 * returned (mandatory capture rule) and each returned move is a complete,
 * maximal jump sequence.
 */
export function getLegalMoves(board: Piece[], player: PlayerColor): Move[] {
  const captures: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p === EMPTY || pieceColor(p) !== player) continue;
    for (const seq of captureSequences(board, sq)) {
      if (seq.length === 0) continue;
      captures.push({
        from: sq,
        path: seq,
        captured: capturedSquares(board, sq, seq),
        promotion: willPromote(p, seq[seq.length - 1]),
      });
    }
  }
  if (captures.length > 0) return captures;

  const quiet: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p === EMPTY || pieceColor(p) !== player) continue;
    for (const to of quietTargets(board, sq)) {
      quiet.push({ from: sq, path: [to], captured: [], promotion: willPromote(p, to) });
    }
  }
  return quiet;
}

// ----------------------------------------------------------- validation

function samePath(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function isPrefix(prefix: number[], full: number[]): boolean {
  return prefix.length < full.length && prefix.every((v, i) => v === full[i]);
}

/**
 * Validate a submitted move for `player`. Server-side only.
 * Codes: NO_PIECE | WRONG_TURN | MUST_CONTINUE | CAPTURE_REQUIRED | ILLEGAL_MOVE
 */
export function validateMove(
  board: Piece[],
  player: PlayerColor,
  from: number,
  path: number[]
): ValidationResult {
  if (!Array.isArray(path) || path.length === 0) {
    return { ok: false, code: "EMPTY_PATH", error: "A move needs at least one destination square." };
  }
  if (from < 0 || from > 63 || path.some((s) => s < 0 || s > 63)) {
    return { ok: false, code: "ILLEGAL_MOVE", error: "Square index out of range." };
  }
  const piece = board[from];
  if (piece === EMPTY) {
    return { ok: false, code: "NO_PIECE", error: "There is no piece on that square." };
  }
  if (pieceColor(piece) !== player) {
    return { ok: false, code: "WRONG_TURN", error: "That piece belongs to the other side." };
  }

  const legal = getLegalMoves(board, player);

  const exact = legal.find((m) => m.from === from && samePath(m.path, path));
  if (exact) return { ok: true, move: exact };

  // Incomplete multi-jump: the submitted path is a proper prefix of a legal capture.
  const longer = legal.find((m) => m.from === from && isPrefix(path, m.path));
  if (longer) {
    return { ok: false, code: "MUST_CONTINUE", error: "Multi-jump: you must continue capturing with the same piece." };
  }

  if (legal.some((m) => m.captured.length > 0)) {
    return { ok: false, code: "CAPTURE_REQUIRED", error: "Capture is mandatory this turn." };
  }
  return { ok: false, code: "ILLEGAL_MOVE", error: "That move is not legal." };
}

// -------------------------------------------------------------- applying

/** Apply a validated move and return the new board (does not mutate input). */
export function applyMove(board: Piece[], move: Move): Piece[] {
  const nb = board.slice() as Piece[];
  let cur = move.from;
  for (const land of move.path) {
    const mid = midpoint(cur, land);
    if (mid !== null) nb[mid] = EMPTY;
    nb[land] = nb[cur];
    nb[cur] = EMPTY;
    cur = land;
  }
  const p = nb[cur];
  if (move.promotion) {
    nb[cur] = p === WHITE_MAN ? WHITE_KING : BLACK_KING;
  }
  return nb;
}

/**
 * Decide the game status after a ply. `playerToMove` is the side now to move.
 * Win: no pieces OR no legal moves for the side to move.
 * Draw: 40 consecutive quiet plies (no capture, no promotion).
 */
export function resolveStatus(
  board: Piece[],
  playerToMove: PlayerColor,
  quietPlies: number
): { status: GameStatus; winner?: PlayerColor } {
  if (quietPlies >= 40) return { status: "DRAW" };
  if (getLegalMoves(board, playerToMove).length === 0) {
    return { status: "FINISHED", winner: otherColor(playerToMove) };
  }
  return { status: "ACTIVE" };
}

// ------------------------------------------------------------- notation

/** Standard checkers square number (1-32) for a board index. */
export function squareNumber(sq: number): number {
  return rowOf(sq) * 4 + Math.floor(colOf(sq) / 2) + 1;
}

/** "23-18" for quiet moves, "23x14x5" for captures. */
export function toNotation(m: Move): string {
  const sep = m.captured.length > 0 ? "x" : "-";
  return [m.from, ...m.path].map(squareNumber).join(sep);
}
