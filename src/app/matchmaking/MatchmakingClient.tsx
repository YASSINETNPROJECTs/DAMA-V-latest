"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { RatingBadge, LevelBadge, Badge } from "@/components/Badge";
import { IconSearch, IconBolt } from "@/components/icons";

interface Searching {
  status: "searching";
  waitSec: number;
  window: { ratingWindow: number; levelGap: number; xpGap: number };
}

type StatusResponse = { status: "idle" } | Searching | { status: "matched"; matchId: string };

export function MatchmakingClient({
  initialStakes,
  availableBalance,
  currency,
  initialRating,
  initialLevel,
  feePercent,
  fairnessCap,
  stepSeconds,
}: {
  initialStakes: number[];
  availableBalance: number;
  currency: string;
  initialRating: number;
  initialLevel: number;
  feePercent: number;
  fairnessCap: number;
  stepSeconds: number;
}) {
  const router = useRouter();
  const [stake, setStake] = useState<number>(initialStakes[1] ?? 0);
  const [phase, setPhase] = useState<"idle" | "searching">("idle");
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function poll() {
    try {
      const res = await fetch("/api/matchmaking/status", { cache: "no-store" });
      const data: StatusResponse = await res.json();
      if (data.status === "matched") {
        stopPolling();
        router.push(`/match/${data.matchId}`);
      } else if (data.status === "searching") {
        setStatus(data);
      }
    } catch {
      /* retry next tick */
    }
  }

  async function join() {
    setError(null);
    try {
      const res = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stake }),
      });
      const data: StatusResponse = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Could not join the queue");
      if (data.status === "matched") {
        router.push(`/match/${data.matchId}`);
        return;
      }
      setPhase("searching");
      setStatus(data);
      stopPolling();
      pollRef.current = setInterval(poll, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function leave() {
    stopPolling();
    setPhase("idle");
    setStatus(null);
    try {
      await fetch("/api/matchmaking/leave", { method: "POST" });
    } catch {
      /* ignore */
    }
  }

  useEffect(() => stopPolling, []);

  return (
    <div className="flex flex-col gap-5 py-2">
      <PageHeader
        eyebrow="Competitive"
        title="Enter the arena"
        subtitle={`Available: ${availableBalance} ${currency} · pot = 2× stake, fee ${feePercent}%`}
        actions={<Badge tone="gold">Stakes escrowed</Badge>}
      />

      {/* Your standing — real data */}
      <div className="flex flex-wrap items-center gap-2">
        <RatingBadge rating={initialRating} />
        <LevelBadge level={initialLevel} />
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <IconBolt className="h-3.5 w-3.5 text-gold" />
          fairness cap ±{fairnessCap} Elo
        </span>
      </div>

      <Card title="Choose your stake" subtitle="Equal stakes only — the window widens as you wait.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {initialStakes.map((s) => {
            const selected = stake === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStake(s)}
                disabled={phase === "searching"}
                className={`flex min-h-[96px] flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-3 transition-all duration-150 disabled:opacity-50 ${
                  selected
                    ? "border-accent bg-accent/10 shadow-glow-strong"
                    : "border-arena-700 bg-arena-900/60 hover:border-accent/40"
                }`}
                aria-pressed={selected}
              >
                <span className={`font-display text-2xl font-bold ${selected ? "text-accent" : "text-white"}`}>
                  {s === 0 ? "Free" : s}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {s === 0 ? "rated" : "units"}
                </span>
                {s > 0 ? (
                  <span className="text-[10px] text-slate-600">
                    win {Math.floor(s * 2 * (1 - feePercent / 100))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className={phase === "searching" ? "border-accent/30" : undefined}>
        {phase === "idle" ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <Button size="lg" onClick={join} className="w-full max-w-sm px-10 text-base">
              <IconSearch className="h-5 w-5" strokeWidth={2.2} />
              {stake === 0 ? "Find opponent — free rated" : `Find opponent — ${stake} units`}
            </Button>
            <p className="max-w-sm text-center text-xs leading-relaxed text-slate-500">
              Exact stake match first. The rating window widens every {stepSeconds}s — never
              beyond ±{fairnessCap} Elo.
            </p>
          </div>
        ) : (
          /* ================= ENTERING THE ARENA ================= */
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <div className="relative flex h-44 w-44 items-center justify-center" aria-hidden="true">
              <span className="absolute inset-0 rounded-full border border-accent/20" />
              {[0, 0.7, 1.4].map((delay) => (
                <span
                  key={delay}
                  className="absolute inset-0 rounded-full border-2 border-accent/60 animate-radar"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
              {/* scanning sweep */}
              <span
                className="absolute inset-2 animate-[spin_3.5s_linear_infinite] rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(34,211,238,0.35), transparent 70deg, transparent 360deg)",
                }}
              />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
                <IconSearch className="h-8 w-8" strokeWidth={2} />
              </span>
            </div>

            <div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.32em] text-accent">
                Searching for opponent
              </p>
              <p className="mt-3 font-display text-6xl font-bold tabular-nums text-white" aria-live="polite">
                {status && status.status === "searching" ? status.waitSec : 0}

                <span className="text-2xl text-slate-500">s</span>
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Stake <span className="font-semibold text-white">{stake}</span> · your{" "}
                {initialRating} Elo - window ±{status && status.status === "searching" ? status.window.ratingWindow : 100}

              </p>
            </div>

            <Button variant="ghost" onClick={leave} className="border border-arena-700 px-8">
              Leave the queue
            </Button>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
