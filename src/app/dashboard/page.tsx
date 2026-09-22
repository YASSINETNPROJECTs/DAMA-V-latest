import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/server/guards";
import { getProfile } from "@/features/users/profile";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { XPBar } from "@/components/XPBar";
import { RatingBadge, LevelBadge, Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { IconPlay } from "@/components/icons";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "My Arena" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  const wins = profile?.stats?.wins ?? 0;
  const losses = profile?.stats?.losses ?? 0;
  const draws = profile?.stats?.draws ?? 0;
  const played = profile?.stats?.matchesPlayed ?? 0;
  const decisive = wins + losses;
  const winRate = decisive > 0 ? Math.round((wins / decisive) * 100) : 0;

  const [recent, topPlayers, myRank] = await Promise.all([
    prisma.matchPlayer.findMany({
      where: { userId: user.id },
      include: { match: { include: { players: { include: { user: true } }, state: true } } },
      orderBy: { match: { createdAt: "desc" } },
      take: 5,
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { rating: "desc" },
      take: 5,
      select: { id: true, username: true, rating: true, level: true },
    }),
    prisma.user
      .count({ where: { rating: { gt: user.rating }, status: "ACTIVE" } })
      .then((n) => n + 1),
  ]);

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* ==================== COMPETITOR IDENTITY — who you are ==================== */}
      <section className="glass glow relative overflow-hidden">
        <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar name={profile?.displayName ?? user.username} image={user.image} size="xl" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">
                My Arena
              </p>
              <h1 className="font-display text-2xl font-bold text-white">
                {profile?.displayName ?? user.username}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <LevelBadge level={user.level} />
                <Badge tone="neutral">Rank #{myRank}</Badge>
              </div>
            </div>
          </div>

          {/* The number that matters */}
          <div className="sm:mx-auto sm:text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Rating
            </p>
            <p className="font-display text-5xl font-bold tabular-nums leading-none text-gold">
              {formatNumber(user.rating)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              peak {formatNumber(profile?.ratingState?.peakRating ?? user.rating)} · {winRate}% wins
            </p>
          </div>

          <div className="sm:w-56">
            <XPBar xp={user.xp} level={user.level} />
            <p className="mt-2 text-xs text-slate-500">
              {played} matches · streak {profile?.stats?.winStreak ?? 0}W
            </p>
          </div>
        </div>

        {/* Record bar — one glance, whole story */}
        <div className="relative border-t border-arena-800 px-5 py-3">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-arena-800">
            <div className="bg-win transition-all" style={{ width: `${decisive ? (wins / decisive) * 100 : 0}%` }} />
            <div className="bg-loss transition-all" style={{ width: `${decisive ? (losses / decisive) * 100 : 0}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
            <span className="text-win">{wins} wins</span>
            <span>{draws} draws</span>
            <span className="text-loss">{losses} losses</span>
          </div>
        </div>
      </section>

      {/* ==================== NEXT COMPETITIVE ACTION ==================== */}
      <Link href="/matchmaking" className="group">
        <div className="glass flex items-center gap-4 p-4 transition group-hover:border-accent/50 group-hover:shadow-glow">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink-950 shadow-glow-strong">
            <IconPlay className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold text-white">Enter matchmaking</p>
            <p className="text-xs text-slate-500">
              Rated arenas · your {user.rating} Elo meets an equal-stake opponent
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-accent">
            Play →
          </span>
        </div>
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ==================== RECENT ARENAS ==================== */}
        <Card title="Recent arenas" subtitle="Your latest battles">
          {recent.length === 0 ? (
            <EmptyState
              title="No matches yet"
              body="Your rated history starts with your first arena."
              action={
                <Link href="/matchmaking">
                  <Button size="sm">Find a match</Button>
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map(({ match }) => {
                const me = match.players.find((p) => p.userId === user.id);
                const opp = match.players.find((p) => p.userId !== user.id);
                const live = match.status === "ACTIVE";
                const draw = match.status === "DRAW";
                const won = match.status === "FINISHED" && match.state?.winnerSeat === me?.seat;
                const chip = live
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : draw
                    ? "border-arena-600 bg-arena-800 text-slate-300"
                    : won
                      ? "border-win/40 bg-win/10 text-win"
                      : "border-loss/40 bg-loss/10 text-loss";
                const label = live ? "LIVE" : draw ? "DRAW" : won ? "WIN" : "LOSS";
                return (
                  <li key={match.id}>
                    <Link
                      href={live ? `/match/${match.id}` : `/matches/${match.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-arena-800 bg-arena-900/50 px-3 py-2.5 transition hover:border-accent/30"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={opp?.user?.username ?? "?"} size="sm" />
                        <span className="truncate text-sm text-slate-200">
                          {opp?.user?.username ?? (opp?.isEngine ? "Engine" : "Open seat")}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {match.stake > 0 ? (
                          <span className="text-[11px] text-gold">{match.stake}</span>
                        ) : null}
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${chip}`}>
                          {label}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 text-right">
            <Link href="/matches" className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline">
              All matches →
            </Link>
          </div>
        </Card>

        {/* ==================== THE LADDER ABOVE YOU ==================== */}
        <Card title="Top of the ladder" subtitle="Chase them down">
          <ol className="flex flex-col gap-2">
            {topPlayers.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/profile/${p.username}`}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                    p.id === user.id
                      ? "border-accent/50 bg-accent/5"
                      : "border-arena-800 bg-arena-900/50 hover:border-accent/30"
                  }`}
                >
                  <span
                    className={`w-6 text-center font-display text-sm font-bold ${
                      i === 0 ? "text-gold" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={p.username} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                    {p.username}
                    {p.id === user.id ? <span className="text-slate-500"> · you</span> : null}
                  </span>
                  <RatingBadge rating={p.rating} />
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-3 text-right">
            <Link href="/leaderboard" className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline">
              Full leaderboard →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
