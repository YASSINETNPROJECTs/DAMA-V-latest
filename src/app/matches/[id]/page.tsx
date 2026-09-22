import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { planStake } from "@/features/competitive/settle";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "Match Result" };
export const dynamic = "force-dynamic";

const PIECE_GLYPH: Record<number, string> = { 1: "", 2: "♔", 3: "", 4: "♚" };

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      players: { include: { user: true } },
      state: true,
      moves: { orderBy: { moveNumber: "asc" } },
    },
  });
  if (!match || !match.state) notFound();
  if (match.status === "ACTIVE") redirect(`/match/${match.id}`);

  const plan = planStake(match.stake);
  const draw = match.status === "DRAW";
  const winner = match.players.find((p) => p.seat === match.state!.winnerSeat);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-4">
      <h1 className="text-2xl font-bold text-white">Match result</h1>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">
            {draw ? "Draw" : `${winner?.user?.username ?? "?"} wins`}
          </p>
          <p className="text-xs text-slate-500">{match.state.endReason}</p>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {match.mode}
          {match.stake > 0
            ? ` · stake ${match.stake} demo units · pot ${plan.pot}, fee ${plan.fee} → winner +${plan.winnerPayout} (simulated)`
            : " · free game"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {match.players.map((p) => (
            <div key={p.seat} className="rounded-xl bg-arena-800 p-3 text-center">
              <p className="truncate text-sm font-semibold text-white">
                {p.user?.username ?? "Open seat"}
              </p>
              <p className="text-xs text-slate-500">
                {p.color} · Lv {p.user?.level ?? 1} · {p.user?.rating ?? 1000}
              </p>
            </div>
          ))}
        </div>
        {match.settledAt ? (
          <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            Settled {match.settledAt.toLocaleString("en-US")} — stats, XP, Elo and simulated
            ledger applied exactly once.
          </p>
        ) : null}
      </Card>

      <Card title="Final position">
        <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-xl border border-arena-600">
          {match.state.board.map((p, sq) => {
            const r = Math.floor(sq / 8);
            const c = sq % 8;
            const dark = (r + c) % 2 === 1;
            return (
              <div
                key={sq}
                className={`flex items-center justify-center ${dark ? "bg-arena-700" : "bg-arena-900"}`}
              >
                {p ? (
                  <span
                    className={`flex h-4/5 w-4/5 items-center justify-center rounded-full text-sm font-bold ${
                      p === 1 || p === 2 ? "bg-accent text-arena-950" : "bg-gold text-arena-950"
                    } ${p === 2 || p === 4 ? "ring-2 ring-white/80" : ""}`}
                  >
                    {PIECE_GLYPH[p]}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Moves">
        <p className="text-xs leading-6 text-slate-400">
          {match.moves.length > 0
            ? match.moves.map((m) => m.notation).join("  ")
            : "No moves recorded."}
        </p>
      </Card>

      <p className="text-center text-xs text-slate-600">
        Signed in as {user.username} ·{" "}
        <a href="/matches" className="text-accent hover:underline">
          Back to my matches
        </a>
      </p>
    </div>
  );
}
