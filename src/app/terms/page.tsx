import type { Metadata } from "next";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-lg py-6">
      <h1 className="mb-4 text-2xl font-bold text-white">Terms of Service</h1>
      <Card>
        <p className="text-sm leading-6 text-slate-400">
          <strong className="text-slate-200">Placeholder.</strong> This demo is provided as-is
          for evaluation. Accounts, ratings, demo-unit balances and match records may be reset
          at any time. No real-money play is offered; no purchase is made; no prize is paid
          out. Full terms will be published before any production launch. Continued use of the
          demo means you accept these placeholder terms and the demo nature of all balances.
        </p>
      </Card>
    </div>
  );
}
