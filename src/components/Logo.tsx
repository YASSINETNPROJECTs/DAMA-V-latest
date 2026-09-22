import Link from "next/link";
import { cn } from "@/lib/utils";

/** DAMA mark: crown + wordmark. CSS/SVG only — no external assets. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2", className)}
      aria-label="DAMA home"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 transition group-hover:shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <path
            d="M3 8l2.5 3L8 6l4 5 4-5 2.5 5L21 8l-1.8 9H4.8L3 8z"
            stroke="#22d3ee"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="6" r="1.1" fill="#22d3ee" />
          <circle cx="12" cy="11" r="1.1" fill="#22d3ee" />
          <circle cx="16" cy="6" r="1.1" fill="#22d3ee" />
        </svg>
      </span>
      <span className="font-display text-xl font-bold tracking-[0.22em] text-white">
        DAMA
      </span>
    </Link>
  );
}
