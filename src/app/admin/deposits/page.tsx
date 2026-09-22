import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { approveDepositAction, rejectDepositAction } from "@/features/finance/adminActions";
import { Card } from "@/components/Card";
import { StatusBadge, Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Deposits" };
export const dynamic = "force-dynamic";

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const filter = (resolvedSearchParams.status ?? "ALL").toUpperCase();

  const deposits = await prisma.depositRequest.findMany({
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
        <h1 className="text-2xl font-bold text-white">Deposits</h1>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <a
              key={f}
              href={f === "ALL" ? "/admin/deposits" : `/admin/deposits?status=${f}`}
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

      {deposits.length === 0 ? (
        <Card>
          <EmptyState title="No deposit requests" body="User deposit submissions will appear here for review." />
        </Card>
      ) : (
        deposits.map((d) => (
          <Card key={d.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-white">
                  +{formatNumber(d.amount)}{" "}
                  <span className="text-xs font-medium text-slate-500">
                    {d.currency} · {d.network}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {d.user.username} · {d.createdAt.toLocaleString("en-US")}
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-400">TXID {d.txId || d.providerReference || "Provider payment"}</p>
                {d.rejectionReason ? (
                  <p className="mt-1 text-[11px] text-loss">Reason: {d.rejectionReason}</p>
                ) : null}
              </div>
              <StatusBadge status={d.status} />
            </div>

            {d.status === "PENDING" ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <form action={approveDepositAction} className="flex-1">
                  <input type="hidden" name="id" value={d.id} />
                  <button
                    type="submit"
                    className="w-full min-h-[40px] rounded-xl bg-accent px-4 text-sm font-semibold text-ink-950 transition hover:bg-accent-soft"
                  >
                    Approve & credit
                  </button>
                </form>
                <form action={rejectDepositAction} className="flex flex-1 gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  <input
                    name="reason"
                    required
                    placeholder="Rejection reason"
                    className="min-h-[40px] w-full rounded-xl border border-arena-600 bg-arena-800 px-3 text-sm text-white outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-loss/20 px-4 text-sm font-semibold text-loss transition hover:bg-loss/30"
                  >
                    Reject
                  </button>
                </form>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-600">
                Reviewed {d.reviewedAt ? d.reviewedAt.toLocaleString("en-US") : "—"} · admin{" "}
                {d.adminId ? d.adminId.slice(0, 8) : "—"}
              </p>
            )}
          </Card>
        ))
      )}
      <p className="text-xs text-slate-600">
        Verify each transaction externally before approving. Approval credits the user exactly
        once — double-approval is blocked by the status claim.
      </p>
    </div>
  );
}
