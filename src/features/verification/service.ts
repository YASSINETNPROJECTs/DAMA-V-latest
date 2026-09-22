// Simulated KYC — backed by demoKycProvider (SimulatedKYCProvider).
// NOT real identity verification. Statuses: NOT_STARTED | PENDING | VERIFIED | REJECTED.

import { prisma } from "@/lib/prisma";
import { demoKycProvider } from "@/features/payments/adapters/demo";

export async function getVerification(userId: string) {
  return prisma.kYCVerification.upsert({
    where: { userId },
    update: {},
    create: { userId, status: "NOT_STARTED", provider: demoKycProvider.name },
  });
}

export async function startVerification(userId: string) {
  const current = await getVerification(userId);
  if (current.status === "PENDING" || current.status === "VERIFIED") return current;

  const started = demoKycProvider.startVerification(); // simulated
  const updated = await prisma.kYCVerification.update({
    where: { userId },
    data: { status: started.status, metadata: { simulated: true } },
  });
  await prisma.auditLog.create({
    data: { userId, action: "KYC_STARTED", meta: { simulated: true } },
  });
  return updated;
}

export async function completeVerification(userId: string) {
  const current = await getVerification(userId);
  if (current.status !== "PENDING") return current;

  const decision = demoKycProvider.simulateDecision(); // simulated auto-approval
  const updated = await prisma.kYCVerification.update({
    where: { userId },
    data: { status: decision.status, metadata: { simulated: true, autoApproved: true } },
  });
  await prisma.auditLog.create({
    data: { userId, action: "KYC_VERIFIED", meta: { simulated: true } },
  });
  return updated;
}
