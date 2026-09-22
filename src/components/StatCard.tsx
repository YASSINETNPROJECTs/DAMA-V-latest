import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Accent = "accent" | "gold" | "win" | "loss";

const accents: Record<Accent, string> = {
  accent: "text-accent",
  gold: "text-gold",
  win: "text-win",
  loss: "text-loss",
};

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: Accent;
  icon?: ReactNode;
  className?: string;
}

/** Numeric hero stat — numbers are the protagonists. */
export function StatCard({ label, value, sub, accent = "accent", icon, className }: StatCardProps) {
  return (
    <div className={cn("glass p-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        {icon ? <span className="text-slate-600">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "mt-1.5 font-display text-2xl font-bold tabular-nums tracking-tight text-white",
          accent !== "accent" && accents[accent]
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
