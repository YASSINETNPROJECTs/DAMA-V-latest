import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";

export const metadata: Metadata = { title: "My Matches" };
export const dynamic = "force-dynamic";

const CHIP: Record<string, string> = {
  LIVE: "border-accent/40 bg-accent/10 text-accent",
  WIN: "border-win/40 bg-win/10 text-win",
  LOSS: "border-loss/40 bg-loss/10 text-loss",
  DRAW: "border-arena-600 bg-arena-800 text-slate-300",
};

export default async function MatchesPage() {
  const user = await requireUser();

  const participations = await prisma.matchPlayer.findMany({
    where: { userId: user.id },
    include: {
      match: { include: { players: { include: { user: true } }, state: true } },
    },
    orderBy: { match: { createdAt: "desc" } },
    take: 30,
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-2">
      <PageHeader
        eyebrow="Career"
        title="My matches"
        subtitle="Every arena you've fought — rated, demo and practice."
      />

      {participations.length === 0 ? (
        <Card>
          <EmptyState
            title="No matches yet"
            body="Your arenas will appear here. Rated ladder starts at 1000 Elo."
            action={
              <Link href="/matchmaking">
                <Button size="sm">Find a rated match</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        participations.map(({ match }) => {
          const me = match.players.find((p) => p.userId === user.id);
          const opp = match.players.find((p) => p.userId !== user.id);
          const live = match.status === "ACTIVE";
          const draw = match.status === "DRAW";
          const won = match.status === "FINISHED" && match.state?.winnerSeat === me?.seat;
          const label = live ? "LIVE" : draw ? "DRAW" : won ? "WIN" : "LOSS";
          const href = live ? `/match/${match.id}` : `/matches/${match.id}`;
          return (
            <Link key={match.id} href={href} className="block">
              <Card className="p-4 transition hover:border-accent/40">
                <div className="flex items-center gap-3">
                  <Avatar name={opp?.user?.username ?? "?"} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      vs {opp?.user?.username ?? (opp?.isEngine ? "Engine" : "Open seat")}
                      {opp?.isEngine ? <span className="font-normal text-slate-500"> · practice</span> : null}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="uppercase tracking-wider">{match.mode}</span>
                      {match.stake > 0 ? (
                        <span className="text-gold">{match.stake} units</span>
                      ) : (
                        <span>free</span>
                      )}
                      <span>·</span>
                      <span>
                        {match.createdAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {!live && match.state?.endReason ? (
                        <>
                          <span>·</span>
                          <span className="truncate">{match.state.endReason}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold ${CHIP[label]}`}>
                    {label}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })
      )}
    </div>
  );
}
