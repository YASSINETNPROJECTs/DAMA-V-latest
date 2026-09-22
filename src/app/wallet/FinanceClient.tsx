"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createDepositAction, createWithdrawalAction } from "@/features/finance/actions";
import { createBinanceDepositAction } from "@/features/payments/actions";
import { Input } from "@/components/Input";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/Card";

interface NetworkOption {
  id: string;
  currency: string;
  network: string;
  depositAddress: string;
  minDeposit: number;
  minWithdrawal: number;
}

export function FinanceClient({ networks }: { networks: NetworkOption[] }) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [networkId, setNetworkId] = useState<string>(networks[0]?.id ?? "");
  const [dep, depAction] = useFormState(createDepositAction, {});
  const [wd, wdAction] = useFormState(createWithdrawalAction, {});
  const [bp, bpAction] = useFormState(createBinanceDepositAction, {});

  const net = networks.find((n) => n.id === networkId) ?? networks[0]!;

  return (
    <Card title="Deposit / withdraw" subtitle="Manual operator processing">
      <div className="mb-4 rounded-2xl border border-accent/30 bg-accent/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-base font-bold text-white">Binance Pay · USDT</p>
            <p className="mt-1 text-xs text-slate-400">Instant hosted checkout + QR. Your wallet is credited only after the provider payment is independently reconciled.</p>
          </div>
          <span className="rounded-full border border-accent/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">Secure</span>
        </div>
        <form action={bpAction} className="mt-3 flex gap-2">
          <input name="amount" type="number" min="1" step="1" placeholder="Amount USDT" required className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-arena-600 bg-arena-800 px-3 text-sm text-white outline-none focus:border-accent" />
          <SubmitButton label="Pay with Binance" pendingLabel="Creating…" />
        </form>
        {bp.error ? <p role="alert" className="mt-2 rounded-lg bg-loss/10 px-3 py-2 text-xs text-loss">{bp.error}</p> : null}
        {bp.checkoutUrl ? (
          <div className="mt-3 rounded-xl border border-arena-700 bg-arena-900/60 p-3">
            <p className="text-xs font-semibold text-white">Payment created</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={bp.checkoutUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-ink-950">Open Binance checkout</a>
              {bp.deeplink ? <a href={bp.deeplink} className="rounded-xl border border-arena-600 px-4 py-2 text-sm font-semibold text-white">Open Binance app</a> : null}
            </div>
            {bp.qrContent ? <div className="mt-3 rounded-xl bg-white p-3 text-center"><p className="text-xs text-slate-700">Scan this QR from Binance</p><img src={bp.qrCodeLink || `https://quickchart.io/qr?text=${encodeURIComponent(bp.qrContent)}&size=220`} alt="Binance Pay QR" className="mx-auto mt-2 h-48 w-48 object-contain" /></div> : null}
          </div>
        ) : null}
      </div>

{networks.length > 0 ? <>
      {/* Mode toggle */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(["deposit", "withdraw"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`min-h-[40px] rounded-xl border text-sm font-semibold capitalize transition ${
              mode === m
                ? "border-accent bg-accent/10 text-accent"
                : "border-arena-700 bg-arena-900/60 text-slate-400 hover:border-accent/40"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Rail selector */}
      <div className="mb-4 flex flex-col gap-1.5">
        <label htmlFor="rail" className="text-sm font-medium text-slate-300">
          Currency / network
        </label>
        <select
          id="rail"
          value={networkId}
          onChange={(e) => setNetworkId(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-arena-600 bg-arena-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-accent"
        >
          {networks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.currency} · {n.network}
            </option>
          ))}
        </select>
      </div>

      {mode === "deposit" ? (
        <form action={depAction} className="flex flex-col gap-4">
          <input type="hidden" name="currency" value={net.currency} />
          <input type="hidden" name="network" value={net.network} />
          <div className="rounded-xl border border-arena-700 bg-arena-800/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Send {net.currency} on {net.network} to
            </p>
            <p className="mt-1 break-all font-mono text-xs text-accent">{net.depositAddress}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">Minimum deposit: {net.minDeposit} {net.currency}</p>
          </div>
          <Input label={`Amount (${net.currency})`} name="amount" type="number" min={net.minDeposit} step={1} placeholder="100" />
          <Input label="Transaction ID (TXID, optional)" name="txId" placeholder="optional on-chain TXID" />
          {dep.error ? <p role="alert" className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">{dep.error}</p> : null}
          {dep.success ? <p role="status" className="rounded-lg bg-win/10 px-3 py-2 text-sm text-win">Deposit request submitted — pending operator approval.</p> : null}
          <SubmitButton label="Submit deposit request" pendingLabel="Submitting…" />
          <p className="text-xs text-slate-600">
            Your balance is credited only after the operator verifies and approves the transaction.
          </p>
        </form>
      ) : (
        <form action={wdAction} className="flex flex-col gap-4">
          <input type="hidden" name="currency" value={net.currency} />
          <input type="hidden" name="network" value={net.network} />
          <Input label={`Amount (${net.currency})`} name="amount" type="number" min={net.minWithdrawal} step={1} placeholder="50" />
          <input type="hidden" name="destinationType" value="BLOCKCHAIN_ADDRESS" />
          <Input label="Destination wallet address" name="destinationValue" placeholder={`your ${net.network} address`} />
          {wd.error ? <p role="alert" className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">{wd.error}</p> : null}
          {wd.success ? <p role="status" className="rounded-lg bg-win/10 px-3 py-2 text-sm text-win">Withdrawal requested — funds are reserved until processed.</p> : null}
          <SubmitButton label="Request withdrawal" pendingLabel="Submitting…" variant="secondary" />
          <p className="text-xs text-slate-600">
            The requested amount is reserved immediately. The operator sends crypto manually and
            records the TXID; timing depends on manual processing and network conditions.
          </p>
        </form>
      )}
      </> : <p className="mt-4 text-sm text-slate-500">Manual crypto rails are currently unavailable.</p>}

    </Card>
  );
}
