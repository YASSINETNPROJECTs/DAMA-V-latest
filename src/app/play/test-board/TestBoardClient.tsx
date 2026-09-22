"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

interface MoveView {
  notation: string;
  seat: number;
}

interface StateView {
  board: number[];
  turn: string;
  status: string;
  winnerSeat: number | null;
  moveNumber: number;
}

interface MatchView {
  matchId: string;
  youSeat: number;
  youColor: string;
  opponentName: string;
  state: StateView;
  moves: MoveView[];
}

const PIECE_GLYPH: Record<number, string> = {
  1: "", 2: "♔", 3: "", 4: "♚",
};

export function TestBoardClient({ username }: { username: string }) {
  const [view, setView] = useState<MatchView | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGame() {
    setBusy(true);
    setError(null);
    setSelected(null);
    setPath([]);
    try {
      const res = await fetch("/api/game/match", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create match");
      setView(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function onSquareClick(sq: number) {
    if (!view || view.state.status !== "ACTIVE" || busy) return;
    if (view.state.turn !== view.youColor) return;
    const piece = view.state.board[sq];
    if (selected === null) {
      // Select own piece: white pieces are 1/2, black are 3/4.
      const isMine =
        view.youColor === "WHITE" ? piece === 1 || piece === 2 : piece === 3 || piece === 4;
      if (isMine) setSelected(sq);
      return;
    }
    if (sq === selected) {
      setSelected(null);
      setPath([]);
      return;
    }
    setPath((p) => [...p, sq]);
  }

  function clearPath() {
    setSelected(null);
    setPath([]);
  }

  async function submitMove() {
    if (!view || selected === null || path.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/game/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: view.matchId, from: selected, path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Move rejected");
      setView(data);
      setSelected(null);
      setPath([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // ---- rendering helpers ----------------------------------------------

  const board = view?.state.board ?? [];
  const myTurn = view?.state.status === "ACTIVE" && view.state.turn === view.youColor;

  function squareClass(sq: number): string {
    const r = Math.floor(sq / 8);
    const c = sq % 8;
    const dark = (r + c) % 2 === 1;
    let cls = dark ? "bg-arena-700" : "bg-arena-900";
    if (selected === sq) cls = "bg-accent/40";
    else if (path.includes(sq)) cls = "bg-gold/40";
    return cls;
  }

  function pieceClass(p: number): string {
    const isWhite = p === 1 || p === 2;
    const isKing = p === 2 || p === 4;
    const base = "flex h-4/5 w-4/5 items-center justify-center rounded-full text-base font-bold ";
    const color = isWhite ? "bg-accent text-arena-950" : "bg-gold text-arena-950";
    const ring = isKing ? " ring-2 ring-white/80" : "";
    return base + color + ring;
  }

  function statusBanner(): { text: string; cls: string } | null {
    if (!view) return null;
    if (view.state.status === "ACTIVE") {
      return myTurn
        ? { text: "Your move — tap a piece, then its destination(s).", cls: "text-accent" }
        : { text: `${view.opponentName} is moving…`, cls: "text-slate-400" };
    }
    if (view.state.status === "DRAW") {
      return { text: "Draw — 40 quiet moves. (Declared by the server.)", cls: "text-gold" };
    }
    // FINISHED — the SERVER declared the winner; the client only displays it.
    const iWon = view.state.winnerSeat === view.youSeat;
    return {
      text: iWon
        ? `You win! ${view.opponentName} has no pieces or no legal move.`
        : `${view.opponentName} wins this one. Rematch?`,
      cls: iWon ? "text-emerald-400" : "text-red-400",
    };
  }

  const banner = statusBanner();

  return (
    <div className="flex flex-col gap-4">
      <header className="text-center">
        <h1 className="text-xl font-bold text-white">Dama Test Board</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {username}, you play White. Black is a server engine seat. English draughts rules
          (mandatory capture, multi-jump).
        </p>
      </header>

      {!view ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-slate-400">
            Start a test game to play the engine on a large mobile-friendly board.
          </p>
          <Button onClick={startGame} disabled={busy} className="w-full max-w-xs">
            {busy ? "Starting…" : "Start test game"}
          </Button>
        </div>
      ) : (
        <>
          {/* Status banner (server-derived only) */}
          {banner ? (
            <p className={`rounded-xl bg-arena-900 px-3 py-2 text-center text-sm ${banner.cls}`}>
              {banner.text}
            </p>
          ) : null}

          {/* Board: 8x8 grid of large touch targets */}
          <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-2xl border-2 border-arena-600 shadow-xl shadow-black/40">
            {Array.from({ length: 64 }, (_, sq) => (
              <button
                key={sq}
                type="button"
                aria-label={`square ${sq}`}
                onClick={() => onSquareClick(sq)}
                className={`flex items-center justify-center ${squareClass(sq)} ${
                  board[sq] ? "cursor-pointer" : ""
                } active:opacity-80`}
                style={{ minWidth: 40, minHeight: 40 }}
              >
                {board[sq] ? (
                  <span className={pieceClass(board[sq])}>{PIECE_GLYPH[board[sq]]}</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Move controls */}
          {myTurn && selected !== null ? (
            <div className="flex items-center gap-2">
              <Button onClick={submitMove} disabled={busy || path.length === 0} className="flex-1">
                {busy
                  ? "Sending…"
                  : `Play ${path.length > 1 ? `jump ×${path.length}` : "move"}`}
              </Button>
              <Button variant="ghost" onClick={clearPath} disabled={busy}>
                Clear
              </Button>
            </div>
          ) : null}
          {selected !== null && path.length === 0 ? (
            <p className="text-center text-xs text-slate-500">
              Piece selected — tap its destination. For a multi-jump, tap each landing square
              in order, then press Play.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          {/* Move list + new game */}
          <div className="flex items-center justify-between gap-3">
            <p className="min-h-6 flex-1 truncate text-xs text-slate-500">
              {view.moves.length > 0
                ? view.moves.map((m) => m.notation).join("  ")
                : "No moves yet."}
            </p>
            <Button variant="secondary" onClick={startGame} disabled={busy} className="shrink-0">
              New game
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
