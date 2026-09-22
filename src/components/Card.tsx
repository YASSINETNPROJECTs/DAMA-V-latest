import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** Accent border + glow — for hero-ish panels. */
  glow?: boolean;
}

/** Glass panel. The ONE card style in the system. */
export function Card({ title, subtitle, children, className, glow }: CardProps) {
  return (
    <section
      className={cn(
        "glass p-5",
        glow && "border-accent/30 shadow-glow",
        className
      )}
    >
      {title ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold tracking-wide text-white">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </header>
      ) : null}
      {children}
    </section>
  );
}
