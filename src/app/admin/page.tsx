import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/guards";
import { getAdminStats, listAudit } from "@/features/admin/service";
import { getAdminSettings } from "@/features/admin/settings";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const stats = await getAdminStats();
  const settings = await getAdminSettings();
  const recent = await listAudit(8);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Admin overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Users" value={formatNumber(stats.users)} />
        <Stat label="Matches" value={formatNumber(stats.matches)} />
        <Stat label="Live matches" value={String(stats.activeMatches)} />
        <Stat label="Total fees" value={formatNumber(stats.totalRevenue)} gold />
        <Stat label="Pending deposits" value={String(stats.pendingDeposits)} warn={stats.pendingDeposits > 0} />
        <Stat label="Pending withdrawals" value={String(stats.pendingWithdrawals + stats.processingWithdrawals)} warn={stats.pendingWithdrawals + stats.processingWithdrawals > 0} />
      </div>

      {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) ? (
        <div className="glass flex flex-wrap items-center gap-3 border-gold/40 p-4">
          <p className="flex-1 text-sm text-gold">
            Action required: {stats.pendingDeposits} deposit(s) and{" "}
            {stats.pendingWithdrawals + stats.processingWithdrawals} withdrawal(s) awaiting review.
          </p>
          <Link href="/admin/deposits" className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-ink-950">
            Review deposits
          </Link>
          <Link href="/admin/withdrawals" className="rounded-lg bg-arena-700 px-3 py-2 text-xs font-bold text-white">
            Review withdrawals
          </Link>
        </div>
      ) : null}

      <Card title="Platform settings snapshot">
        <p className="text-sm text-slate-400">
          Fee {settings.feePercent}% · matchmaking{" "}
          <strong className={settings.matchmakingEnabled ? "text-emerald-400" : "text-loss"}>
            {settings.matchmakingEnabled ? "on" : "off"}
          </strong>{" "}
          · registration{" "}
          <strong className={settings.registrationOpen ? "text-emerald-400" : "text-loss"}>
            {settings.registrationOpen ? "open" : "closed"}
          </strong>
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Financial operations are manual and operator-controlled. Deposits credit balances only on
          approval; withdrawals are reserved immediately and released on rejection. Every action is
          audit-logged.
        </p>
      </Card>

      <Card title="Recent audit events">
        <ul className="flex flex-col gap-1.5 text-xs text-slate-400">
          {recent.map((a) => (
            <li key={a.id} className="flex justify-between gap-3">
              <span>
                <span className="text-slate-200">{a.action}</span>
                {a.user ? ` · ${a.user.username}` : ""}
              </span>
              <span className="shrink-0 text-slate-600">{a.createdAt.toLocaleString("en-US")}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value, gold, warn }: { label: string; value: string; gold?: boolean; warn?: boolean }) {
  return (
    <div className="glass p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 font-display text-lg font-bold ${
          gold ? "text-gold" : warn ? "text-gold" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
