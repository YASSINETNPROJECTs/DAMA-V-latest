import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { HeroBoard } from "@/components/HeroBoard";
import { IconPlay, IconSearch, IconTrophy, IconShield } from "@/components/icons";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const steps = [
  {
    Icon: IconSearch,
    title: "Pick your stake",
    body: "Free rated or simulated-unit arenas. Equal stakes, fairness-capped pairing.",
  },
  {
    Icon: IconPlay,
    title: "Enter the arena",
    body: "Server-validated board, live clocks, reconnect-safe rooms. Pure skill.",
  },
  {
    Icon: IconTrophy,
    title: "Climb the ladder",
    body: "Elo from 1000. Every result moves your rank — win streaks move it faster.",
  },
];

export default async function HomePage() {
  // Real platform stats — nothing hardcoded.
  const [players, matches, top] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.match.count({ where: { status: { in: ["FINISHED", "DRAW"] } } }),
    prisma.user.findFirst({ where: { status: "ACTIVE" }, orderBy: { rating: "desc" } }),
  ]);

  return (
    <div className="flex flex-col">
      {/* ============================ HERO — THE BOARD IS THE HERO ============================ */}
      <section className="flex flex-col items-center gap-6 pb-10 pt-6 text-center sm:pt-10">
        <Badge tone="accent">Competitive Dama Arena</Badge>
        <h1 className="text-balance font-display text-4xl font-bold leading-[1.04] tracking-tight text-white sm:text-5xl">
          Outthink. Outplay. <span className="text-accent">Outrank.</span>
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
          The arena for English draughts — rated ladders, fair matchmaking and a
          server-authoritative board.
        </p>

        <HeroBoard />

        <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full px-10">
              <IconPlay className="h-5 w-5" strokeWidth={2.2} />
              Play now
            </Button>
          </Link>
          <Link href="/leaderboard" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full px-10">
              Leaderboard
            </Button>
          </Link>
        </div>

        <dl className="grid w-full max-w-md grid-cols-3 gap-4 border-t border-arena-800 pt-5">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">Players</dt>
            <dd className="font-display text-xl font-bold text-white">{formatNumber(players)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">Matches</dt>
            <dd className="font-display text-xl font-bold text-white">{formatNumber(matches)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">Top rating</dt>
            <dd className="font-display text-xl font-bold text-gold">
              {top ? formatNumber(top.rating) : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* ========================== HOW COMPETITION WORKS ========================== */}
      <section className="grid gap-4 py-8 sm:grid-cols-3">
        {steps.map(({ Icon, title, body }, i) => (
          <div key={title} className="glass relative overflow-hidden p-5">
            <span
              className="absolute -right-3 -top-4 font-display text-[80px] font-bold leading-none text-arena-800/60"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <Icon className="relative h-6 w-6 text-accent" />
            <h3 className="relative mt-3 font-display text-sm font-semibold text-white">{title}</h3>
            <p className="relative mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
          </div>
        ))}
      </section>

      {/* ============================ TRUST + FINAL CTA ============================ */}
      <section className="glass mt-4 flex flex-col items-center gap-4 px-6 py-10 text-center">
        <IconShield className="h-7 w-7 text-accent" />
        <h2 className="text-balance font-display text-2xl font-bold text-white sm:text-3xl">
          Your first rated match is one minute away.
        </h2>
        <p className="max-w-md text-sm text-slate-400">
          Everyone starts at 1000 Elo. Create a free account, pick a stake and get paired —
          where you finish is up to you.
        </p>
        <Link href="/register">
          <Button size="lg" className="px-10">
            Enter the arena
          </Button>
        </Link>
        <Badge tone="gold">Player vs player · operator-processed payments</Badge>
      </section>
    </div>
  );
}
