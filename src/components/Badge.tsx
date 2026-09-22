import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "accent" | "gold" | "win" | "loss" | "neutral" | "info";

const tones: Record<Tone, string> = {
  accent: "border-accent/40 bg-accent/10 text-accent",
  gold: "border-gold/40 bg-gold/10 text-gold",
  win: "border-win/40 bg-win/10 text-win",
  loss: "border-loss/40 bg-loss/10 text-loss",
  neutral: "border-arena-600 bg-arena-800 text-slate-400",
  info: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Numeric rating chip — the number is the hero. */
export function RatingBadge({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-lg border border-gold/40 bg-gold/10 px-2 py-0.5">
      <span className="font-display text-sm font-bold text-gold">{rating}</span>
      <span className="text-[10px] uppercase tracking-wider text-gold/70">elo</span>
    </span>
  );
}

export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2 py-0.5">
      <span className="text-[10px] uppercase tracking-wider text-accent/70">Lv</span>
      <span className="font-display text-sm font-bold text-accent">{level}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "ACTIVE" || status === "VERIFIED" || status === "COMPLETED"
      ? "win"
      : status === "PENDING" || status === "SUSPENDED"
        ? "gold"
        : status === "FINISHED"
          ? "info"
          : "loss";
  return <Badge tone={tone}>{status}</Badge>;
}
