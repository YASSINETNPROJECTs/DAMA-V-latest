"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import type { PublicUser } from "@/types";

interface NavbarProps {
  user: PublicUser | null;
  onLogout: () => Promise<void>;
}

const guestLinks = [
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
];

const playerLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/matchmaking", label: "Matchmaking" },
  { href: "/matches", label: "Matches" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/wallet", label: "Wallet" },
];

/** Premium top bar. PLAY is the visual protagonist; admin stays separate. */
export function Navbar({ user, onLogout }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-arena-800/80 bg-ink-950/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo href={user ? "/dashboard" : "/"} />

        {user ? (
          <>
            {/* Desktop */}
            <div className="hidden items-center gap-1 lg:flex">
              {playerLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition",
                    pathname === l.href
                      ? "bg-arena-800 text-white"
                      : "text-slate-400 hover:bg-arena-800/60 hover:text-white"
                  )}
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/play" className="ml-2">
                <Button size="sm" className="px-5">
                  Play
                </Button>
              </Link>
              <Link
                href="/profile"
                className="ml-3 flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-arena-800/60"
              >
                <Avatar name={user.username} image={user.image} size="sm" />
                <span className="max-w-[90px] truncate text-sm text-slate-300">
                  {user.username}
                </span>
              </Link>
              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="ml-1 rounded-lg border border-arena-700 px-2.5 py-1.5 text-xs text-slate-500 transition hover:text-slate-300"
                >
                  Admin
                </Link>
              ) : null}
            </div>

            {/* Mobile: hamburger */}
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-lg text-slate-300 transition hover:bg-arena-800 lg:hidden"
            >
              <span className={cn("h-0.5 w-5 bg-current transition", open && "translate-y-2 rotate-45")} />
              <span className={cn("h-0.5 w-5 bg-current transition", open && "opacity-0")} />
              <span className={cn("h-0.5 w-5 bg-current transition", open && "-translate-y-2 -rotate-45")} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              {guestLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-arena-800/60 hover:text-white"
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <Link href="/register">
              <Button size="sm" className="px-5">
                Play free
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {open && user ? (
        <div className="border-t border-arena-800 bg-ink-950/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex flex-col">
            <Link
              href="/play"
              onClick={() => setOpen(false)}
              className="mb-2 rounded-xl bg-accent py-3 text-center font-display text-sm font-bold text-ink-950"
            >
              PLAY NOW
            </Link>
            {[...playerLinks, { href: "/profile", label: "Profile" }, { href: "/settings", label: "Settings" }, { href: "/verification", label: "Verification" }]
              .concat(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : [])
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-3 text-base",
                    pathname === l.href
                      ? "bg-arena-800 text-white"
                      : "text-slate-300 hover:bg-arena-800"
                  )}
                >
                  {l.label}
                </Link>
              ))}
            <form action={onLogout} className="mt-1">
              <button
                type="submit"
                className="w-full rounded-lg bg-arena-800 px-3 py-3 text-left text-base text-slate-300"
              >
                Sign out ({user.username})
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
}
