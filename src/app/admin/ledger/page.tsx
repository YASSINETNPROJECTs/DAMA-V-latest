import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Ledger" };
export const dynamic = "force-dynamic";

export default async function AdminLedgerPage() {
  await requireAdmin();
  const entries = await prisma.ledgerEntry.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-white">Ledger</h1>
      <Card className="p-4">
        {entries.length === 0 ? (
          <EmptyState title="No ledger entries" body="Every balance operation will be recorded here." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-lg border border-arena-800 bg-arena-900/50 px-3 py-2 text-xs">
                <Badge tone={e.amount >= 0 ? "win" : "loss"}>
                  {e.amount >= 0 ? "+" : ""}{e.amount}
                </Badge>
                <span className="w-40 shrink-0 truncate font-semibold uppercase tracking-wide text-slate-300">
                  {e.type}
                </span>
                <span className="hidden w-24 shrink-0 truncate text-slate-500 sm:block">
                  {e.user.username}
                </span>
                <span className="hidden w-16 shrink-0 text-slate-500 sm:block">{e.currency}</span>
                <span className="flex-1 truncate text-slate-500">
                  total {formatNumber(e.balanceAfter)} · reserved {formatNumber(e.reservedAfter)}
                  {e.reference ? ` · ref ${e.reference.slice(0, 8)}` : ""}
                </span>
                <span className="shrink-0 text-slate-600">
                  {e.createdAt.toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
