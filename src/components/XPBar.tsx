import { cn } from "@/lib/utils";

interface XPBarProps {
  xp: number;
  level: number;
  className?: string;
}

/** XP progress toward the next level (level n = 100·(n−1)² XP). */
export function XPBar({ xp, level, className }: XPBarProps) {
  const floor = 100 * (level - 1) * (level - 1);
  const ceil = 100 * level * level;
  const pct = Math.min(100, Math.max(0, Math.round(((xp - floor) / (ceil - floor)) * 100)));

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
        <span className="uppercase tracking-wider">Level {level}</span>
        <span>
          {xp.toLocaleString()} / {ceil.toLocaleString()} XP
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-arena-800"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-strong to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
