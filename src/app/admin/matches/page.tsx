import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Admin · Matches" };
export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  await requireAdmin();
  const matches = await prisma.match.findMany({
    include: { players: { include: { user: { select: { username: true } } } }, state: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-white">Matches</h1>
      {matches.length === 0 ? (
        <Card>
          <EmptyState title="No matches yet" />
        </Card>
      ) : (
        matches.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {m.players.map((p) => p.user?.username ?? (p.isEngine ? "Engine" : "Open seat")).join(" vs ")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {m.mode} · stake {m.stake} {m.currency} · {m.createdAt.toLocaleString("en-US")}
                  {m.state?.endReason ? ` · ${m.state.endReason}` : ""}
                </p>
              </div>
              <StatusBadge status={m.status} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
