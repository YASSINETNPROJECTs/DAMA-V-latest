import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { XPBar } from "@/components/XPBar";
import { StatCard } from "@/components/StatCard";
import { RatingBadge, LevelBadge, Badge, StatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { IconShield } from "@/components/icons";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Player" };
export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    include: { profile: true, stats: true, ratingState: true, verification: true },
  });
  if (!user) notFound();

  // PUBLIC profile: competitive identity only — never wallet/ledger data.
  const wins = user.stats?.wins ?? 0;
  const losses = user.stats?.losses ?? 0;
  const draws = user.stats?.draws ?? 0;
  const played = user.stats?.matchesPlayed ?? 0;
  const decisive = wins + losses;
  const winRate = decisive > 0 ? Math.round((wins / decisive) * 100) : 0;

  const [rank, recent] = await Promise.all([
    prisma.user.count({ where: { rating: { gt: user.rating }, status: "ACTIVE" } }).then((n) => n + 1),
    prisma.matchPlayer.findMany({
      where: { userId: user.id },
      include: { match: { include: { players: { include: { user: true } }, state: true } } },
      orderBy: { match: { createdAt: "desc" } },
      take: 6,
    }),
  ]);

  const verified = user.verification?.status === "VERIFIED";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-2">
      {/* ==================== COMPETITOR HEADER ==================== */}
      <section className="glass glow relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Avatar name={user.profile?.displayName ?? user.username} image={user.image} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-white">
                {user.profile?.displayName ?? user.username}
              </h1>
              {verified ? (
                <Badge tone="win">
                  <IconShield className="h-3 w-3" /> Verified
                </Badge>
              ) : null}
              {user.country ? <Badge tone="neutral">{user.country}</Badge> : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">@{user.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LevelBadge level={user.level} />
              <Badge tone="gold">Rank #{rank}</Badge>
            </div>
          </div>
          <div className="sm:text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rating</p>
            <p className="font-display text-4xl font-bold tabular-nums leading-none text-gold">
              {formatNumber(user.rating)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              peak {formatNumber(user.ratingState?.peakRating ?? user.rating)}
            </p>
          </div>
          <div className="sm:w-52">
            <XPBar xp={user.xp} level={user.level} />
          </div>
        </div>

        {/* Record bar */}
        <div className="relative border-t border-arena-800 px-5 py-3">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-arena-800">
            <div className="bg-win" style={{ width: `${decisive ? (wins / decisive) * 100 : 0}%` }} />
            <div className="bg-loss" style={{ width: `${decisive ? (losses / decisive) * 100 : 0}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
            <span className="text-win">{wins}W</span>
            <span>
              {draws}D · {played} played · {winRate}% wins
            </span>
            <span className="text-loss">{losses}L</span>
          </div>
        </div>
      </section>

      {/* ==================== SEASON ==================== */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Win rate" value={`${winRate}%`} accent="win" />
        <StatCard label="Record" value={`${wins}-${losses}`} sub={`${draws} draws`} />
        <StatCard label="Best streak" value={`${user.stats?.bestStreak ?? 0}W`} sub={`current ${user.stats?.winStreak ?? 0}W`} accent="accent" />
        <StatCard label="Peak rating" value={formatNumber(user.ratingState?.peakRating ?? user.rating)} accent="gold" />
      </section>

      {/* ==================== RECENT ARENAS ==================== */}
      <Card title="Recent arenas" subtitle="Last 6 matches">
        {recent.length === 0 ? (
          <EmptyState title="No matches yet" body="This competitor hasn't fought in an arena." />
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map(({ match }) => {
              const meSeat = match.players.find((p) => p.userId === user.id)?.seat;
              const opp = match.players.find((p) => p.userId !== user.id);
              const live = match.status === "ACTIVE";
              const draw = match.status === "DRAW";
              const won = match.status === "FINISHED" && match.state?.winnerSeat === meSeat;
              return (
                <li key={match.id}>
                  <Link
                    href={live ? `/match/${match.id}` : `/matches/${match.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-arena-800 bg-arena-900/50 px-3 py-2.5 transition hover:border-accent/30"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={opp?.user?.username ?? "?"} size="sm" />
                      <span className="truncate text-sm text-slate-200">
                        vs {opp?.user?.username ?? "Engine"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {match.stake > 0 ? <span className="text-[11px] text-gold">{match.stake}</span> : null}
                      <StatusBadge status={live ? "ACTIVE" : draw ? "DRAW" : won ? "COMPLETED" : "BANNED"} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Link href="/matchmaking">
        <Button className="w-full">Challenge via matchmaking</Button>
      </Link>
      <p className="text-center text-xs text-slate-600">
        Private data — including any demo-unit balance — is never shown on public profiles.
      </p>
    </div>
  );
}
