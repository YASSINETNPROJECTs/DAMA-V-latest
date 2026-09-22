"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { Board, type LastMove } from "@/components/Board";
import { getLegalMoves, type Piece, type PlayerColor } from "@/features/game/engine";

interface RoomPlayerView {
  seat: number;
  color: string;
  name: string;
  level: number;
  rating: number;
  isEngine: boolean;
  userId: string | null;
  connected: boolean;
}

interface RoomStateView {
  board: number[];
  turn: string;
  status: string;
  winnerSeat: number | null;
  endReason: string | null;
  whiteMs: number;
  blackMs: number;
  forcedFrom: number | null;
  moveNumber: number;
  quietPlies: number;
}

interface RoomView {
  matchId: string;
  mode: string;
  status: string;
  stake: number;
  youSeat: number | null;
  players: RoomPlayerView[];
  state: RoomStateView;
  captured: { white: number; black: number };
  moves: { notation: string; seat: number }[];
  serverTime: number;
}

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function capturedDots(count: number, myColor: string): React.ReactNode {
  if (count <= 0) return <span className="h-2 w-2 rounded-full bg-arena-700" />;
  const dot = myColor === "WHITE" ? "bg-gold" : "bg-accent";
  return (
    <span className="flex items-center gap-0.5" title={`Captured ${count}`}>
      {Array.from({ length: Math.min(count, 12) }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      ))}
      {count > 12 ? <span className="text-[9px] text-slate-500">+{count - 12}</span> : null}
    </span>
  );
}

export function MatchRoomClient({ matchId, initial }: { matchId: string; initial: RoomView }) {
  const [view, setView] = useState<RoomView>(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const youSeatRef = useRef<number | null>(initial.youSeat);
  const prevBoardRef = useRef<number[]>(initial.state.board);

  const applyView = useCallback((v: RoomView) => {
    if (v.youSeat != null) youSeatRef.current = v.youSeat;
    setView({ ...v, youSeat: v.youSeat ?? youSeatRef.current });
  }, []);

  /* Last-move highlighting — derived by diffing boards (UI only). */
  useEffect(() => {
    const cur = view.state.board;
    const prev = prevBoardRef.current;
    if (prev.length === 64 && prev !== cur) {
      let from = -1;
      let to = -1;
      for (let i = 0; i < 64; i++) {
        if (prev[i] !== cur[i]) {
          if (prev[i] === 0) to = i;
          else if (cur[i] === 0) from = i;
        }
      }
      if (from >= 0 && to >= 0) setLastMove({ from, to });
    }
    prevBoardRef.current = cur;
  }, [view.state.board]);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/match/${matchId}/state`, { cache: "no-store" });
      if (res.ok) applyView(await res.json());
    } catch {
      /* retry next tick */
    }
  }, [matchId, applyView]);

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setLive(true);
      socket.emit("match:join", { matchId, seat: youSeatRef.current });
      refetch();
    });
    socket.on("disconnect", () => setLive(false));
    socket.on("connect_error", () => setLive(false));
    socket.on("match:state", (v: RoomView) => {
      applyView(v);
      setError(null);
      setSelected(v.state.forcedFrom ?? null);
    });
    socket.on("match:presence", ({ seat, connected }: { seat: number; connected: boolean }) => {
      setView((v) =>
        v ? { ...v, players: v.players.map((p) => (p.seat === seat ? { ...p, connected } : p)) } : v
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId, refetch, applyView]);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      if (!live) refetch();
    }, 1000);
    return () => clearInterval(t);
  }, [live, refetch]);

  // ------------------------------------------------------------- logic (unchanged)

  const me = view.players.find((p) => p.seat === view.youSeat) ?? null;
  const myColor = me?.color ?? null;
  const openSeat = view.players.find((p) => p.userId === null && !p.isEngine) ?? null;
  const myTurn = view.state.status === "ACTIVE" && myColor !== null && view.state.turn === myColor;
  const forced = view.state.forcedFrom;

  /* UI-only move hints from the pure engine — validation stays server-side. */
  const legalMoves = useMemo(() => {
    if (!myTurn || !myColor) return [];
    try {
      return getLegalMoves(view.state.board as unknown as Piece[], myColor as PlayerColor);
    } catch {
      return [];
    }
  }, [view.state.board, myTurn, myColor]);

  const activeFrom = forced ?? selected;
  const legalTargets = useMemo(
    () => (activeFrom === null ? [] : legalMoves.filter((m) => m.from === activeFrom).map((m) => m.path[0])),
    [legalMoves, activeFrom]
  );
  const captureTargets = useMemo(
    () =>
      activeFrom === null
        ? []
        : legalMoves
            .filter((m) => m.from === activeFrom && m.captured.length > 0)
            .map((m) => m.path[0]),
    [legalMoves, activeFrom]
  );
  const capturers = useMemo(
    () => Array.from(new Set(legalMoves.filter((m) => m.captured.length > 0).map((m) => m.from))),
    [legalMoves]
  );

  function clockMs(color: string): number {
    const base = color === "WHITE" ? view.state.whiteMs : view.state.blackMs;
    const running = view.state.status === "ACTIVE" && view.state.turn === color;
    const elapsed = running ? Math.max(0, now - view.serverTime) : 0;
    return Math.max(0, base - elapsed);
  }

  async function joinSeat() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/game/match/${matchId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join");
      applyView(data);
      socketRef.current?.emit("match:join", { matchId, seat: data.youSeat });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function onSquareClick(sq: number) {
    if (!myTurn || busy) return;
    if (forced !== null) {
      if (sq !== forced) void submitHop(forced, sq);
      return;
    }
    const piece = view.state.board[sq];
    const isMine = myColor === "WHITE" ? piece === 1 || piece === 2 : piece === 3 || piece === 4;
    if (selected === null) {
      if (isMine) setSelected(sq);
      return;
    }
    if (sq === selected) {
      setSelected(null);
      return;
    }
    void submitHop(selected, sq);
  }

  async function submitHop(from: number, to: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/game/match/${matchId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Move rejected");
      applyView(data);
      setSelected(data.state.forcedFrom ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // ------------------------------------------------------------- presentation

  function banner(): { text: string; cls: string } {
    if (view.state.status === "DRAW") {
      return { text: "Draw — 40 quiet moves (server decision).", cls: "border-gold/40 bg-gold/10 text-gold" };
    }
    if (view.state.status === "FINISHED") {
      const winner = view.players.find((p) => p.seat === view.state.winnerSeat);
      const iWon = view.state.winnerSeat === view.youSeat;
      const reason =
        view.state.endReason === "timeout"
          ? "on time"
          : view.state.endReason === "disconnect"
            ? "by disconnect"
            : "— no pieces or moves";
      return {
        text: `${iWon ? "Victory" : `${winner?.name ?? "Opponent"} wins`} ${reason}`,
        cls: iWon ? "border-win/40 bg-win/10 text-win" : "border-loss/40 bg-loss/10 text-loss",
      };
    }
    if (openSeat) {
      return { text: "Waiting for an opponent — share the match link.", cls: "border-arena-600 bg-arena-900/70 text-slate-300" };
    }
    if (myTurn) {
      return forced !== null
        ? { text: "Multi-jump — keep tapping landing squares.", cls: "border-accent/50 bg-accent/10 text-accent" }
        : { text: "Your move.", cls: "border-accent/50 bg-accent/10 text-accent" };
    }
    return { text: "Opponent is thinking…", cls: "border-arena-600 bg-arena-900/70 text-slate-400" };
  }

  function PlayerPanel({ p, isMe }: { p: RoomPlayerView; isMe: boolean }) {
    const active = view.state.status === "ACTIVE" && view.state.turn === p.color;
    const clock = clockMs(p.color);
    const taken = p.color === "WHITE" ? view.captured.black : view.captured.white;
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-200 ${
          active ? "border-accent/60 bg-arena-800/80 shadow-glow" : "border-arena-700/60 bg-arena-900/50"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={p.name} size="md" online={p.connected} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {p.name}
              {isMe ? <span className="font-normal text-slate-500"> · you</span> : null}
            </p>
            <p className="text-[11px] text-slate-500">
              Lv {p.level} · {p.rating} Elo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {capturedDots(taken, p.color)}
          <span
            className={`font-display text-xl font-bold tabular-nums ${
              clock < 30000 && view.state.status === "ACTIVE" ? "text-loss animate-pulse-soft" : "text-white"
            }`}
          >
            {fmtClock(clock)}
          </span>
        </div>
      </div>
    );
  }

  const opponent = view.players.find((p) => p.seat !== view.youSeat) ?? null;
  const b = banner();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 py-1">
      {/* Meta bar */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {view.mode} arena{view.stake > 0 ? ` · ${view.stake} units` : " · free"}
        </p>
        <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${live ? "text-win" : "text-slate-500"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-win" : "bg-slate-600"}`} />
          {live ? "live" : "polling"}
        </p>
      </div>

      {opponent ? <PlayerPanel p={opponent} isMe={false} /> : null}

      <p className={`rounded-xl border px-3 py-2 text-center text-sm font-medium ${b.cls}`}>
        {b.text}
      </p>

      {/* The board */}
      <Board
        board={view.state.board}
        onSquareClick={myTurn && !busy ? onSquareClick : undefined}
        selected={selected}
        forced={forced}
        legalTargets={myTurn ? legalTargets : []}
        captureTargets={myTurn ? captureTargets : []}
        capturers={myTurn ? capturers : []}
        lastMove={lastMove}
      />

      {me ? <PlayerPanel p={me} isMe /> : null}

      <div className="flex flex-col gap-2">
        {openSeat && view.youSeat !== null ? (
          <div className="glass border-gold/30 p-3">
            <p className="mb-2 text-xs text-slate-400">Share this arena with your opponent:</p>
            <input
              readOnly
              value={`/match/${matchId}`}
              onFocus={(e) => e.target.select()}
              className="mb-3 w-full rounded-lg border border-arena-600 bg-arena-800 px-2 py-1.5 text-xs text-accent"
            />
            <Button variant="secondary" onClick={joinSeat} disabled={busy} className="w-full">
              Take the Black seat
            </Button>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="min-h-6 flex-1 truncate text-xs text-slate-600">
            {view.moves.length > 0 ? view.moves.map((m) => m.notation).join("  ") : "No moves yet."}
          </p>
          <Link href="/play" className="shrink-0">
            <Button variant="ghost" size="sm" className="border border-arena-700">
              New arena
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
