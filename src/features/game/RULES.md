# DAMA Game Rules — English Draughts (8×8)

These are the exact rules implemented by the server engine in `engine.ts`.
The server is the single source of truth: clients submit moves, the server
validates, applies, and declares results. **The client never says "I won."**

## 1. Board

- 8×8 squares. Only the 32 dark squares are playable.
- Rows are numbered 0–7 top to bottom. Row 0 is Black's back rank.
- Black starts on rows 0–2, White on rows 5–7, 12 men each.
- In code, a square is a board index `0–63` (`index = row * 8 + col`).
  Squares where `(row + col) is even` are light and never used.

## 2. Pieces

- **Man** — moves one step diagonally **forward** (Black: row increasing;
  White: row decreasing). Captures by jumping two squares diagonally forward
  over an adjacent enemy piece.
- **King** — promoted piece. Moves and captures one step diagonally in **all
  four** directions.

## 3. Turn

- White moves first. Players alternate.
- All piece values and turns are tracked server-side in `GameState`.

## 4. Mandatory capture

- If a player has any capture available (with any piece), a capture **must**
  be played. Quiet moves are rejected with `CAPTURE_REQUIRED`.

## 5. Multi-jump

- If, after a jump, the same piece can capture again, it **must** continue
  jumping. The whole sequence is one move (e.g. `23x14x5`).
- A partial sequence is rejected with `MUST_CONTINUE`.

## 6. Promotion

- A man that reaches the far last row (Black: row 7, White: row 0) is crowned
  and becomes a king **immediately**.
- A man crowned in the middle of a multi-jump stops there — the move ends at
  crowning (English draughts rule).

## 7. Win

- A player wins when the opponent has **no pieces left** OR **no legal move**
  on their turn. The server sets `Match.status = FINISHED` and records
  `GameState.winnerSeat`.

## 8. Draw

- **40-move rule (quiet plies):** a *quiet ply* is a half-move with no capture
  and no promotion. If **40 consecutive quiet plies** are played, the server
  declares a draw (`Match.status = DRAW`). Counter stored in
  `GameState.quietPlies`, reset to 0 on every capture or promotion.
- This is the only automatic draw in Phase 2. Threefold repetition and
  insufficient-material draws are deferred to a later phase.

## 9. Notation

- Standard checkers numbering: dark squares numbered 1–32 row by row.
  `squareNumber(index) = row * 4 + floor(col / 2) + 1`.
- Quiet move: `23-18`. Capture: `23x14`. Multi-capture: `23x14x5`.

## 10. Server authority

- `POST /api/game/move` runs `validateMove` on the server and only persists
  legal moves. Win/draw detection runs server-side after every ply.
- The engine (dummy Black seat in test games) replies synchronously inside the
  same API call, so the client always receives the position after both plies.
