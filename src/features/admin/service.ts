// Admin data access: stats, user list, audit list. Server-side only.

import { prisma } from "@/lib/prisma";

export async function getAdminStats() {
  const [users, matches, activeMatches, revenue, pendingKyc, ledgerRows, pendingDeposits, pendingWithdrawals, processingWithdrawals] =
    await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.match.count({ where: { status: "ACTIVE" } }),
      prisma.platformRevenue.aggregate({ _sum: { amount: true } }),
      prisma.kYCVerification.count({ where: { status: "PENDING" } }),
      prisma.ledgerEntry.count(),
      prisma.depositRequest.count({ where: { status: "PENDING" } }),
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
      prisma.withdrawalRequest.count({ where: { status: "PROCESSING" } }),
    ]);
  return {
    users,
    matches,
    activeMatches,
    totalRevenue: revenue._sum.amount ?? 0,
    pendingKyc,
    ledgerRows,
    pendingDeposits,
    pendingWithdrawals,
    processingWithdrawals,
  };
}

export async function listUsers(take = 100) {
  return prisma.user.findMany({
    include: { stats: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function listAudit(take = 100) {
  return prisma.auditLog.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}
