// Deterministic engine opponent for TEST matches (the "dummy seat").
// Prefer the capture that takes the most pieces; otherwise play the first
// quiet move. Deliberately simple — real matchmaking/AI comes in later phases.

import { getLegalMoves, type Move, type Piece, type PlayerColor } from "./engine";

export function chooseEngineMove(board: Piece[], color: PlayerColor): Move | null {
  const legal = getLegalMoves(board, color);
  if (legal.length === 0) return null;

  const captures = legal.filter((m) => m.captured.length > 0);
  if (captures.length > 0) {
    return captures.reduce((best, m) => (m.captured.length > best.captured.length ? m : best));
  }
  return legal[0];
}
