import type { Metadata } from "next";
import { requireUser } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { getDefaultCurrency, getWallet } from "@/features/finance/service";
import { cancelDepositAction, cancelWithdrawalAction } from "@/features/finance/actions";
import { availableBalance } from "@/features/finance/logic";
import { FinanceClient } from "./FinanceClient";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge, StatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await requireUser();
  const currency = await getDefaultCurrency();
  const wallet = await getWallet(user.id, currency);
  const available = availableBalance(wallet.balance, wallet.reserved);

  const [networks, deposits, withdrawals, ledger] = await Promise.all([
    prisma.walletNetwork.findMany({ where: { enabled: true }, orderBy: [{ currency: "asc" }, { network: "asc" }] }),
    prisma.depositRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.withdrawalRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.ledgerEntry.findMany({ where: { userId: user.id, currency }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-2">
      <PageHeader
        eyebrow="Funds"
        title="Wallet"
        subtitle={`${currency} · deposits approved manually by the operator`}
        actions={<Badge tone="gold">Operator-processed</Badge>}
      />

      {/* Balance hero */}
      <section className="glass glow relative overflow-hidden p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/10 blur-2xl" aria-hidden="true" />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {formatNumber(wallet.balance)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Available</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-win sm:text-3xl">
              {formatNumber(available)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reserved</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-gold sm:text-3xl">
              {formatNumber(wallet.reserved)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Reserved funds are locked in match stakes or pending withdrawals and cannot be spent.
          Deposits credit your balance after the operator approves your transaction;
          withdrawals are sent by the operator after review.
        </p>
      </section>

      <FinanceClient networks={networks.map((n) => ({
        id: n.id,
        currency: n.currency,
        network: n.network,
        depositAddress: n.depositAddress,
        minDeposit: n.minDeposit,
        minWithdrawal: n.minWithdrawal,
      }))} />

      <Card title="Deposits" subtitle="Your deposit requests">
        {deposits.length === 0 ? (
          <EmptyState title="No deposits yet" body="Submit a deposit request after sending crypto to the shown address." />
        ) : (
          <ul className="flex flex-col gap-2">
            {deposits.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-arena-800 bg-arena-900/50 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-display font-bold text-white">
                    +{d.amount} <span className="text-xs font-medium text-slate-500">{d.currency} · {d.network}</span>
                  </p>
                  <p className="truncate text-[11px] text-slate-500">TXID {d.txId || "Provider payment"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={d.status} />
                  {d.status === "PENDING" ? (
                    <form action={cancelDepositAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="text-xs text-slate-500 hover:text-loss">Cancel</button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Withdrawals" subtitle="Your withdrawal requests">
        {withdrawals.length === 0 ? (
          <EmptyState title="No withdrawals yet" body="Withdrawals are processed manually by the operator." />
        ) : (
          <ul className="flex flex-col gap-2">
            {withdrawals.map((wd) => (
              <li key={wd.id} className="flex items-center justify-between gap-3 rounded-xl border border-arena-800 bg-arena-900/50 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-display font-bold text-white">
                    −{wd.amount} <span className="text-xs font-medium text-slate-500">{wd.currency} · {wd.network}</span>
                  </p>
                  <p className="truncate text-[11px] text-slate-500">to {wd.destinationValue}</p>
                  {wd.txId ? <p className="truncate text-[11px] text-slate-400">TXID {wd.txId}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={wd.status} />
                  {wd.status === "PENDING" ? (
                    <form action={cancelWithdrawalAction}>
                      <input type="hidden" name="id" value={wd.id} />
                      <button type="submit" className="text-xs text-slate-500 hover:text-loss">Cancel</button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Ledger" subtitle={`${currency} · full audit trail`}>
        {ledger.length === 0 ? (
          <EmptyState title="No ledger entries yet" body="Every balance movement will appear here." />
        ) : (
          <ul className="flex flex-col gap-2">
            {ledger.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-arena-800 bg-arena-900/50 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">{e.type}</p>
                  <p className="text-[11px] text-slate-500">
                    → total {formatNumber(e.balanceAfter)} · reserved {formatNumber(e.reservedAfter)}
                  </p>
                </div>
                <span className={`shrink-0 font-display font-bold tabular-nums ${e.amount >= 0 ? "text-win" : "text-loss"}`}>
                  {e.amount >= 0 ? "+" : ""}{e.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
