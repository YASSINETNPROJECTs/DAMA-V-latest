import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/Badge";
import { reconcilePaymentAction } from "@/features/payments/actions";
import { requireAdmin } from "@/server/guards";

export const metadata: Metadata = { title: "Admin · Payments" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const payments = await prisma.paymentOrder.findMany({
    include: { user: { select: { username: true } }, paymentMethod: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="flex flex-col gap-3">
      <div><h1 className="text-2xl font-bold text-white">Provider payments</h1><p className="mt-1 text-xs text-slate-500">Reconcile provider orders before any internal credit is considered final.</p></div>
      {payments.length === 0 ? <Card><EmptyState title="No provider payments" body="Binance Pay orders will appear here." /></Card> : payments.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display font-bold text-white">{p.amount.toString()} {p.currency}</p>
              <p className="text-xs text-slate-500">{p.user.username} · {p.paymentMethod.displayName}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-400">Trade: {p.merchantTradeNo}</p>
              {p.providerReference ? <p className="break-all font-mono text-[11px] text-slate-500">Provider: {p.providerReference}</p> : null}
              {p.lastProviderStatus ? <p className="text-[11px] text-slate-500">Provider status: {p.lastProviderStatus}</p> : null}
            </div>
            <StatusBadge status={p.status} />
          </div>
          {(p.status === "PENDING" || p.status === "CREATED") ? <form action={reconcilePaymentAction} className="mt-3"><input type="hidden" name="id" value={p.id} /><button type="submit" className="min-h-[40px] w-full rounded-xl bg-accent px-4 text-sm font-semibold text-ink-950">Query Binance & reconcile</button></form> : null}
        </Card>
      ))}
    </div>
  );
}
