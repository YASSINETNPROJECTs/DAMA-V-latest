"use client";

import { useState, useTransition } from "react";
import {
  startVerificationAction,
  completeVerificationAction,
} from "@/features/verification/actions";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-arena-700 text-slate-300",
  PENDING: "bg-gold/20 text-gold",
  VERIFIED: "bg-emerald-500/20 text-emerald-400",
  REJECTED: "bg-red-500/20 text-red-400",
};

export function VerificationClient({ initialStatus }: { initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      const next = await startVerificationAction();
      setStatus(next);
      if (next === "PENDING") {
        // Simulated review delay — the demo provider auto-approves.
        setTimeout(() => {
          startTransition(async () => {
            setStatus(await completeVerificationAction());
          });
        }, 2500);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-white">Identity verification</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gold">
          Simulated — SimulatedKYCProvider, NOT real KYC
        </p>
      </header>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Current status</p>
          <span
            className={`rounded-lg px-3 py-1 text-xs font-bold ${STATUS_STYLES[status] ?? STATUS_STYLES.NOT_STARTED}`}
          >
            {status}
          </span>
        </div>

        {status === "NOT_STARTED" || status === "REJECTED" ? (
          <div className="mt-4">
            <Button onClick={start} disabled={pending} className="w-full">
              {pending ? "Starting…" : "Start simulated verification"}
            </Button>
          </div>
        ) : null}

        {status === "PENDING" ? (
          <p className="mt-4 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold">
            Reviewing documents (simulated)… auto-approval in a few seconds.
          </p>
        ) : null}

        {status === "VERIFIED" ? (
          <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Verified (simulated). No real identity check was performed.
          </p>
        ) : null}

        <p className="mt-4 text-xs text-slate-600">
          In production this step would use a licensed KYC provider. The demo adapter performs
          no verification and stores only a simulated status.
        </p>
      </Card>
    </div>
  );
}
