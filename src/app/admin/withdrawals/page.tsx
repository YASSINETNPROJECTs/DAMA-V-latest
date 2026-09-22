import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import {
  completeWithdrawalAction,
  processWithdrawalAction,
  rejectWithdrawalAction,
} from "@/features/finance/adminActions";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Withdrawals" };
export const dynamic = "force-dynamic";

const FILTERS = ["ALL", "PENDING", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED"] as const;

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const filter = (resolvedSearchParams.status ?? "ALL").toUpperCase();

  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: filter !== "ALL" && (FILTERS as readonly string[]).includes(filter)
      ? { status: filter as never }
      : {},
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-white">Withdrawals</h1>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <a
              key={f}
              href={f === "ALL" ? "/admin/withdrawals" : `/admin/withdrawals?status=${f}`}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-arena-700 text-slate-400 hover:border-accent/40"
              }`}
            >
              {f}
            </a>
          ))}
        </div>
      </div>

      {withdrawals.length === 0 ? (
        <Card>
          <EmptyState title="No withdrawal requests" body="User withdrawal requests will appear here." />
        </Card>
      ) : (
        withdrawals.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-white">
                  −{formatNumber(w.amount)}{" "}
                  <span className="text-xs font-medium text-slate-500">
                    {w.currency} · {w.network}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {w.user.username} · {w.createdAt.toLocaleString("en-US")}
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-400">
                  → {w.destinationValue}
                </p>
                {w.txId ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-accent">TXID {w.txId}</p>
                ) : null}
                {w.rejectionReason ? (
                  <p className="mt-1 text-[11px] text-loss">Reason: {w.rejectionReason}</p>
                ) : null}
              </div>
              <StatusBadge status={w.status} />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {w.status === "PENDING" ? (
                <form action={processWithdrawalAction}>
                  <input type="hidden" name="id" value={w.id} />
                  <button type="submit" className="w-full min-h-[40px] rounded-xl bg-arena-700 px-4 text-sm font-semibold text-white transition hover:bg-arena-600">
                    Mark as processing
                  </button>
                </form>
              ) : null}

              {w.status === "PROCESSING" ? (
                <form action={completeWithdrawalAction} className="flex gap-2">
                  <input type="hidden" name="id" value={w.id} />
                  <input
                    name="txId"
                    required
                    placeholder="Payout TXID (send crypto first, externally)"
                    className="min-h-[40px] w-full rounded-xl border border-arena-600 bg-arena-800 px-3 text-sm text-white outline-none focus:border-accent"
                  />
                  <button type="submit" className="shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-ink-950 transition hover:bg-accent-soft">
                    Complete
                  </button>
                </form>
              ) : null}

              {w.status === "PENDING" || w.status === "PROCESSING" ? (
                <form action={rejectWithdrawalAction} className="flex gap-2">
                  <input type="hidden" name="id" value={w.id} />
                  <input
                    name="reason"
                    required
                    placeholder="Rejection reason (releases funds back)"
                    className="min-h-[40px] w-full rounded-xl border border-arena-600 bg-arena-800 px-3 text-sm text-white outline-none focus:border-accent"
                  />
                  <button type="submit" className="shrink-0 rounded-xl bg-loss/20 px-4 text-sm font-semibold text-loss transition hover:bg-loss/30">
                    Reject
                  </button>
                </form>
              ) : null}
            </div>
          </Card>
        ))
      )}
      <p className="text-xs text-slate-600">
        Send crypto from your external wallet/exchange BEFORE completing. Completing finalizes the
        ledger; rejecting releases the reserved funds back to the user.
      </p>
    </div>
  );
}
