import type { Metadata } from "next";
import { requireUser } from "@/server/guards";
import { getVerification } from "@/features/verification/service";
import { VerificationClient } from "./VerificationClient";

export const metadata: Metadata = { title: "Verification" };
export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const user = await requireUser();
  const v = await getVerification(user.id);

  return (
    <div className="mx-auto max-w-md py-6">
      <VerificationClient initialStatus={v.status} />
    </div>
  );
}
