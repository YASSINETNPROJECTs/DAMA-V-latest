// Single-hop validation on top of the Phase 2 engine.
// The realtime client sends only { from, to } — one hop at a time. A capture
// that can continue returns mustContinue=true and the room layer forces the
// next hop to start from the same piece.

import {
  applyMove,
  BLACK_MAN,
  getLegalMoves,
  isKing,
  pieceColor,
  WHITE_MAN,
  type Piece,
  type PlayerColor,
} from "./engine";

const rowOf = (sq: number) => Math.floor(sq / 8);

export interface HopOk {
  ok: true;
  board: Piece[]; // board after this hop
  capturedNow: number[]; // squares captured by this hop (0 or 1)
  mustContinue: boolean; // true = multi-jump continues, same piece
  promotion: boolean; // true = this hop crowns a man (move ends)
}

export type HopResult =
  | HopOk
  | { ok: false; code: string; error: string };

export function validateHop(
  board: Piece[],
  player: PlayerColor,
  from: number,
  to: number
): HopResult {
  if (from < 0 || from > 63 || to < 0 || to > 63) {
    return { ok: false, code: "ILLEGAL_MOVE", error: "Square index out of range." };
  }
  const piece = board[from];
  if (piece === 0) {
    return { ok: false, code: "NO_PIECE", error: "There is no piece on that square." };
  }
  if (pieceColor(piece) !== player) {
    return { ok: false, code: "WRONG_TURN", error: "That piece belongs to the other side." };
  }

  const legal = getLegalMoves(board, player);
  const match = legal.find((m) => m.from === from && m.path[0] === to);
  if (!match) {
    if (legal.some((m) => m.captured.length > 0)) {
      return { ok: false, code: "CAPTURE_REQUIRED", error: "Capture is mandatory this turn." };
    }
    return { ok: false, code: "ILLEGAL_MOVE", error: "That move is not legal." };
  }

  // A capture hop that crowns ends the move (English draughts).
  const crowned =
    !isKing(piece) &&
    ((piece === WHITE_MAN && rowOf(to) === 0) || (piece === BLACK_MAN && rowOf(to) === 7));
  const mustContinue = match.captured.length > 0 && match.path.length > 1 && !crowned;

  const capturedNow = match.captured.slice(0, 1);
  const boardAfter = applyMove(board, {
    from,
    path: [to],
    captured: capturedNow,
    promotion: crowned,
  });

  return { ok: true, board: boardAfter, capturedNow, mustContinue, promotion: crowned };
}
