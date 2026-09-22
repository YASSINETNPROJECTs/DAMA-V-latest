import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { saveNetworkAction, toggleNetworkAction, togglePaymentMethodAction } from "@/features/finance/adminActions";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Admin · Wallet settings" };
export const dynamic = "force-dynamic";

export default async function AdminWalletPage() {
  await requireAdmin();
  const networks = await prisma.walletNetwork.findMany({
    orderBy: [{ currency: "asc" }, { network: "asc" }],
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Wallet settings</h1>
      <p className="-mt-2 text-xs text-slate-500">
        Deposit addresses are stored ONLY here — never in code. Users see enabled rails in their wallet.
      </p>

      {networks.length === 0 ? (
        <Card>
          <EmptyState title="No rails configured" body="Create your first currency/network below." />
        </Card>
      ) : (
        networks.map((n) => (
          <Card key={n.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-white">
                  {n.currency} <span className="text-slate-500">·</span> {n.network}
                  <span className="ml-2 text-xs font-medium text-slate-500">{n.displayName}</span>
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{n.depositAddress}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  min deposit {n.minDeposit} · min withdrawal {n.minWithdrawal}
                </p>
              </div>
              <form action={toggleNetworkAction}>
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="enabled" value={n.enabled ? "" : "on"} />
                <button
                  type="submit"
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                    n.enabled
                      ? "border-win/40 bg-win/10 text-win"
                      : "border-arena-600 bg-arena-800 text-slate-400"
                  }`}
                >
                  {n.enabled ? "ENABLED" : "DISABLED"}
                </button>
              </form>
            </div>

            {/* Edit rail */}
            <form action={saveNetworkAction} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="id" value={n.id} />
              <input type="hidden" name="currency" value={n.currency} />
              <input type="hidden" name="network" value={n.network} />
              <input type="hidden" name="displayName" value={n.displayName} />
              <input
                name="depositAddress"
                defaultValue={n.depositAddress}
                required
                className="min-h-[40px] rounded-xl border border-arena-600 bg-arena-800 px-3 font-mono text-xs text-white outline-none focus:border-accent sm:col-span-2"
              />
              <input
                name="minDeposit"
                type="number"
                min={0}
                step={1}
                defaultValue={n.minDeposit}
                className="min-h-[40px] rounded-xl border border-arena-600 bg-arena-800 px-3 text-sm text-white outline-none focus:border-accent"
                aria-label="Minimum deposit"
              />
              <input
                name="minWithdrawal"
                type="number"
                min={0}
                step={1}
                defaultValue={n.minWithdrawal}
                className="min-h-[40px] rounded-xl border border-arena-600 bg-arena-800 px-3 text-sm text-white outline-none focus:border-accent"
                aria-label="Minimum withdrawal"
              />
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input type="checkbox" name="enabled" defaultChecked={n.enabled} className="h-4 w-4 accent-cyan-400" />
                Enabled
              </label>
              <button type="submit" className="min-h-[40px] rounded-xl bg-arena-700 px-4 text-sm font-semibold text-white transition hover:bg-arena-600">
                Save rail
              </button>
            </form>
          </Card>
        ))
      )}

      <Card title="Payment methods" subtitle="Provider integrations are disabled by default until credentials and merchant onboarding are complete.">
        <div className="flex flex-col gap-2">
          {(await prisma.paymentMethod.findMany({ orderBy: [{ currency: "asc" }, { code: "asc" }] })).map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-arena-700 bg-arena-900/50 p-3">
              <div>
                <p className="font-semibold text-white">{m.displayName}</p>
                <p className="text-[11px] text-slate-500">{m.code} · {m.type} · {m.currency}{m.network ? ` · ${m.network}` : ""}</p>
              </div>
              <form action={togglePaymentMethodAction}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="enabled" value={m.enabled ? "" : "on"} />
                <button type="submit" className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${m.enabled ? "border-win/40 bg-win/10 text-win" : "border-arena-600 bg-arena-800 text-slate-400"}`}>
                  {m.enabled ? "ENABLED" : "DISABLED"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </Card>

      {/* New rail */}
      <Card title="Add currency / network" subtitle="Example: USDT · TRC20">
        <form action={saveNetworkAction} className="grid gap-3 sm:grid-cols-2">
          <Input label="Currency" name="currency" placeholder="USDT" required />
          <Input label="Network" name="network" placeholder="TRC20" required />
          <Input label="Display name (optional)" name="displayName" placeholder="Tether (TRC20)" />
          <Input label="Minimum deposit" name="minDeposit" type="number" min={0} step={1} defaultValue="5" />
          <Input label="Minimum withdrawal" name="minWithdrawal" type="number" min={0} step={1} defaultValue="10" />
          <Input label="Deposit address" name="depositAddress" placeholder="TXXXX…" required />
          <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked className="h-5 w-5 accent-cyan-400" />
            Enabled
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" className="w-full">Add rail</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
