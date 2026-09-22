import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/features/auth/session";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { IconTrophy } from "@/components/icons";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

const RANK_STYLE = [
  "border-gold/50 bg-gold/10 text-gold shadow-glow-gold", // 1
  "border-slate-400/40 bg-slate-400/10 text-slate-200", // 2
  "border-amber-700/50 bg-amber-700/10 text-amber-500", // 3
];

export default async function LeaderboardPage() {
  const sessionUser = await getCurrentUser();
  const top = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    include: { stats: true },
    orderBy: [{ rating: "desc" }, { level: "desc" }],
    take: 50,
  });

  const podium = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-2">
      <PageHeader
        eyebrow="Competition"
        title="Leaderboard"
        subtitle="The ladder everyone is climbing. Beat the player above you."
      />

      {top.length === 0 ? (
        <Card>
          <EmptyState title="No competitors yet" body="Rankings appear once rated matches settle." />
        </Card>
      ) : (
        <>
          {/* Podium */}
          <section className="grid grid-cols-3 items-end gap-3">
            {[podium[1], podium[0], podium[2]]
              .filter(Boolean)
              .map((p) => {
                const rank = top.findIndex((u) => u.id === p.id) + 1;
                const first = rank === 1;
                return (
                  <Link
                    key={p.id}
                    href={`/profile/${p.username}`}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-2 pb-4 pt-5 text-center transition hover:border-accent/40 ${
                      first ? "glass glow-gold border-gold/40" : "glass"
                    } ${first ? "pb-6" : ""}`}
                  >
                    <span className={RANK_STYLE[rank - 1] + " rounded-full border px-2.5 py-0.5 font-display text-xs font-bold"}>
                      #{rank}
                    </span>
                    <Avatar name={p.username} size={first ? "xl" : "lg"} />
                    <span className="w-full truncate text-sm font-semibold text-white">
                      {p.username}
                    </span>
                    <span className="font-display text-xl font-bold text-gold">
                      {formatNumber(p.rating)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      {p.stats?.wins ?? 0}W · Lv {p.level}
                    </span>
                  </Link>
                );
              })}
          </section>

          {/* Rows */}
          <ol className="flex flex-col gap-2">
            {rest.map((u, i) => {
              const rank = i + 4;
              const isMe = sessionUser?.id === u.id;
              return (
                <li key={u.id}>
                  <Link
                    href={`/profile/${u.username}`}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                      isMe
                        ? "border-accent/50 bg-accent/5 shadow-glow"
                        : "border-arena-800 bg-arena-900/50 hover:border-accent/30"
                    }`}
                  >
                    <span className="w-8 text-center font-display text-sm font-bold text-slate-500">
                      {rank}
                    </span>
                    <Avatar name={u.username} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">
                        {u.username}
                        {isMe ? <span className="font-normal text-slate-500"> · you</span> : null}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Lv {u.level} · {u.stats?.wins ?? 0}W {u.stats?.losses ?? 0}L
                      </span>
                    </span>
                    <IconTrophy className="hidden h-4 w-4 text-slate-700 sm:block" />
                    <span className="shrink-0 font-display text-lg font-bold text-gold">
                      {formatNumber(u.rating)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
