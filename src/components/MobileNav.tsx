"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconHome,
  IconPlay,
  IconSwords,
  IconTrophy,
  IconWallet,
} from "@/components/icons";

const items = [
  { href: "/dashboard", label: "Home", Icon: IconHome },
  { href: "/matches", label: "Matches", Icon: IconSwords },
  { href: "/play", label: "Play", Icon: IconPlay, cta: true },
  { href: "/leaderboard", label: "Ranks", Icon: IconTrophy },
  { href: "/wallet", label: "Wallet", Icon: IconWallet },
];

/** Bottom navigation — one-hand mobile control. Hidden during matches. */
export function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/match/")) return null; // keep the board unobstructed

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-arena-800/80 bg-ink-950/90 backdrop-blur-md sm:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {items.map(({ href, label, Icon, cta }) =>
          cta ? (
            <Link key={href} href={href} className="flex justify-center" aria-label="Play">
              <span className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl bg-accent text-ink-950 shadow-glow-strong transition active:scale-95">
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 transition",
                pathname.startsWith(href) ? "text-accent" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
