import type { Metadata } from "next";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-lg py-6">
      <h1 className="mb-4 text-2xl font-bold text-white">Privacy Policy</h1>
      <Card>
        <p className="text-sm leading-6 text-slate-400">
          <strong className="text-slate-200">Placeholder.</strong> This demo stores the minimum
          needed to run the platform: your username, email (hashed password), game records and
          simulated demo-unit ledger. No identity verification is performed (KYC is simulated),
          no payment data is collected, and no data is sold. A production privacy policy will
          be published before any real launch, including data-subject rights and retention
          details.
        </p>
      </Card>
    </div>
  );
}
