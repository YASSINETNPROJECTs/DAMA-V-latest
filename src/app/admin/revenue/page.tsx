import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Revenue" };
export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  await requireAdmin();
  const [total, rows] = await Promise.all([
    prisma.platformRevenue.aggregate({ _sum: { amount: true } }),
    prisma.platformRevenue.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Platform revenue</h1>
      <StatCard
        label="Total match fees"
        value={formatNumber(total._sum.amount ?? 0)}
        sub="separate from all player funds"
        accent="gold"
        className="max-w-xs"
      />
      <Card title="Fee records" subtitle="By match, most recent first">
        {rows.length === 0 ? (
          <EmptyState title="No revenue yet" body="Match fees appear here when staked matches settle." />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-arena-800 bg-arena-900/50 px-3 py-2.5 text-sm">
                <span className="font-display font-bold text-gold">+{formatNumber(r.amount)} {r.currency}</span>
                <span className="flex-1 truncate text-xs text-slate-500">
                  {r.source}{r.matchId ? ` · match ${r.matchId.slice(0, 8)}` : ""}
                </span>
                <span className="text-xs text-slate-600">{r.createdAt.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
