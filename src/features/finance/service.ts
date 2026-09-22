// Financial core — manual operator-controlled crypto.
// The website manages INTERNAL accounting only. The operator controls the
// external wallet/exchange: deposits are credited after manual admin approval,
// withdrawals are sent externally by the operator who then records the TXID.
//
// Concurrency strategy (all server-side, never frontend):
//  - every balance op runs inside prisma.$transaction
//  - wallet rows are locked with SELECT ... FOR UPDATE before read/modify
//  - status transitions use guarded updateMany (claim pattern) → idempotent
//  - DepositRequest.txId is UNIQUE → a TXID can never credit twice
//  - match settlement claims Match.settledAt atomically → pays exactly once

import { prisma } from "@/lib/prisma";
import { getSetting } from "@/features/admin/settings";
import type { Prisma, LedgerType } from "@prisma/client";
import {
  availableBalance,
  canManageFinances,
  canReserve,
  depositInputError,
  depositTransitionAllowed,
  validDestinationAddress,
  withdrawalInputError,
  withdrawalTransitionAllowed,
} from "./logic";

export class FinanceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "FinanceError";
  }
}

export const DEFAULT_CURRENCY = "USDT";

export async function getDefaultCurrency(): Promise<string> {
  return getSetting<string>("defaultCurrency", DEFAULT_CURRENCY);
}

// ---------------------------------------------------------------- wallets

export async function getWallet(userId: string, currency: string) {
  return prisma.wallet.upsert({
    where: { userId_currency: { userId, currency } },
    update: {},
    create: { userId, currency, balance: 0, reserved: 0 },
  });
}

/** Available = total − reserved. */
export async function getAvailableBalance(userId: string, currency: string): Promise<number> {
  const w = await getWallet(userId, currency);
  return availableBalance(w.balance, w.reserved);
}

async function ensureWalletTx(tx: Prisma.TransactionClient, userId: string, currency: string) {
  await tx.wallet.upsert({
    where: { userId_currency: { userId, currency } },
    update: {},
    create: { userId, currency, balance: 0, reserved: 0 },
  });
}

/** Lock a wallet row for the duration of the transaction, then return it. */
async function lockWallet(tx: Prisma.TransactionClient, userId: string, currency: string) {
  await ensureWalletTx(tx, userId, currency);
  await tx.$queryRaw`SELECT "id" FROM "wallets" WHERE "userId" = ${userId} AND "currency" = ${currency} FOR UPDATE`;
  return tx.wallet.findUniqueOrThrow({
    where: { userId_currency: { userId, currency } },
  });
}

interface LedgerInput {
  userId: string;
  currency: string;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  reservedAfter: number;
  reference?: string | null;
  metadata?: Record<string, unknown>;
}

async function writeLedger(tx: Prisma.TransactionClient, input: LedgerInput): Promise<void> {
  await tx.ledgerEntry.create({
    data: {
      userId: input.userId,
      currency: input.currency,
      type: input.type,
      amount: input.amount,
      balanceAfter: input.balanceAfter,
      reservedAfter: input.reservedAfter,
      reference: input.reference ?? null,
      metadata: input.metadata ?? ({} as any),

    },
  });
}

// ---------------------------------------------------------- generic escrow

/** Reserve funds inside an existing transaction. Never starts a nested transaction. */
export async function reserveFundsTx(
  tx: Prisma.TransactionClient,
  userId: string,
  currency: string,
  amount: number,
  type: LedgerType,
  reference: string
): Promise<void> {
  const w = await lockWallet(tx, userId, currency);
  if (!canReserve(w.balance, w.reserved, amount)) {
    throw new FinanceError(402, "INSUFFICIENT_FUNDS", "Insufficient available balance.");
  }
  const reservedAfter = w.reserved + amount;
  await tx.wallet.update({ where: { id: w.id }, data: { reserved: reservedAfter } });
  await writeLedger(tx, {
    userId, currency, type, amount,
    balanceAfter: w.balance, reservedAfter, reference, metadata: { automated: false },
  });
}

/** Reserve funds (escrow). Atomic + row-locked. */
export async function reserveFunds(
  userId: string,
  currency: string,
  amount: number,
  type: LedgerType,
  reference: string
): Promise<void> {
  await prisma.$transaction((tx) =>
    reserveFundsTx(tx, userId, currency, amount, type, reference)
  );
}

/** Release previously reserved funds back to available (no balance change). */
export async function releaseFunds(
  userId: string,
  currency: string,
  amount: number,
  type: LedgerType,
  reference: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const w = await lockWallet(tx, userId, currency);
    if (w.reserved < amount) {
      throw new FinanceError(409, "RESERVED_MISMATCH", "Reserved funds mismatch.");
    }
    const reservedAfter = w.reserved - amount;
    await tx.wallet.update({ where: { id: w.id }, data: { reserved: reservedAfter } });
    await writeLedger(tx, {
      userId, currency, type, amount,
      balanceAfter: w.balance, reservedAfter, reference, metadata: { automated: false },
    });
  });
}

/**
 * Settle an already-escrowed two-player match inside the caller's transaction.
 * This is the only finance-layer entry point that moves match escrow into
 * player balances/revenue. Wallets are locked in deterministic user-id order
 * to reduce deadlock risk when the same users have concurrent operations.
 */
export async function settleMatchEscrowTx(
  tx: Prisma.TransactionClient,
  input: {
    matchId: string;
    currency: string;
    stake: number;
    fee: number;
    winnerUserId: string | null;
    playerUserIds: [string, string];
  }
): Promise<void> {
  const { matchId, currency, stake, fee, winnerUserId, playerUserIds } = input;
  if (!Number.isInteger(stake) || stake < 0 || !Number.isInteger(fee) || fee < 0) {
    throw new FinanceError(400, "BAD_SETTLEMENT", "Invalid settlement amounts.");
  }
  if (new Set(playerUserIds).size !== 2) {
    throw new FinanceError(409, "BAD_MATCH_PLAYERS", "A match must have exactly two distinct players.");
  }
  if (winnerUserId !== null && !playerUserIds.includes(winnerUserId)) {
    throw new FinanceError(409, "BAD_WINNER", "Winner is not a player in this match.");
  }
  if (fee > stake * 2) {
    throw new FinanceError(409, "BAD_FEE", "Settlement fee exceeds the match pot.");
  }

  const orderedIds = [...playerUserIds].sort();
  const locked = new Map<string, Awaited<ReturnType<typeof lockWallet>>>();
  for (const userId of orderedIds) {
    locked.set(userId, await lockWallet(tx, userId, currency));
  }

  for (const userId of playerUserIds) {
    const w = locked.get(userId)!;
    if (w.reserved < stake) {
      throw new FinanceError(409, "RESERVED_MISMATCH", "Match escrow is missing or inconsistent.");
    }
  }

  if (stake === 0) return;

  if (winnerUserId === null) {
    for (const userId of playerUserIds) {
      const w = locked.get(userId)!;
      const reservedAfter = w.reserved - stake;
      await tx.wallet.update({ where: { id: w.id }, data: { reserved: reservedAfter } });
      await writeLedger(tx, {
        userId, currency, type: "REFUND", amount: stake,
        balanceAfter: w.balance, reservedAfter, reference: matchId,
        metadata: { stake, reason: "draw" },
      });
    }
    return;
  }

  const loserUserId = playerUserIds.find((id) => id !== winnerUserId)!;
  const winner = locked.get(winnerUserId)!;
  const loser = locked.get(loserUserId)!;
  if (loser.balance < stake) {
    throw new FinanceError(409, "BALANCE_MISMATCH", "Loser wallet cannot cover the escrowed stake.");
  }

  const winnerPayout = stake * 2 - fee;
  const winnerNet = winnerPayout - stake;
  const loserBalanceAfter = loser.balance - stake;
  const loserReservedAfter = loser.reserved - stake;
  const winnerBalanceAfter = winner.balance + winnerNet;
  const winnerReservedAfter = winner.reserved - stake;

  await tx.wallet.update({
    where: { id: loser.id },
    data: { balance: loserBalanceAfter, reserved: loserReservedAfter },
  });
  await writeLedger(tx, {
    userId: loserUserId, currency, type: "MATCH_LOSS", amount: stake,
    balanceAfter: loserBalanceAfter, reservedAfter: loserReservedAfter,
    reference: matchId, metadata: { stake },
  });

  await tx.wallet.update({
    where: { id: winner.id },
    data: { balance: winnerBalanceAfter, reserved: winnerReservedAfter },
  });
  await writeLedger(tx, {
    userId: winnerUserId, currency, type: "MATCH_WIN", amount: winnerNet,
    balanceAfter: winnerBalanceAfter, reservedAfter: winnerReservedAfter,
    reference: matchId, metadata: { stake, payout: winnerPayout, fee },
  });

  if (fee > 0) {
    await tx.platformRevenue.create({
      data: {
        amount: fee, currency, source: "match_fee", matchId,
        metadata: { stake, automated: true },
      },
    });
  }
}

// --------------------------------------------------------------- deposits

export async function createDepositRequest(
  userId: string,
  input: { currency: string; network: string; amount: number; txId?: string; provider?: string; providerReference?: string }
): Promise<void> {
  const { currency, network, amount, txId } = input;
  const txIdClean = input.txId?.trim() || null;
  if (txIdClean && txIdClean.length > 128) throw new FinanceError(400, "BAD_TXID", "Transaction ID is too long.");
  const net = await prisma.walletNetwork.findUnique({
    where: { currency_network: { currency, network } },
  });
  if (!net || !net.enabled) {
    throw new FinanceError(400, "NETWORK_DISABLED", "This currency/network is not enabled.");
  }
  const err = depositInputError({ amount, minDeposit: net.minDeposit });
  if (err) throw new FinanceError(400, "BAD_AMOUNT", err);

  try {
    await prisma.depositRequest.create({
      data: { userId, currency, network, amount, txId: txIdClean, provider: input.provider ?? "MANUAL_CRYPTO", providerReference: input.providerReference ?? null, status: "PENDING" },
    });
  } catch (e) {
    // Unique constraint on txId → the same TXID can never be submitted twice.
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new FinanceError(409, "DUPLICATE_TXID", "This TXID has already been submitted.");
    }
    throw e;
  }
  await prisma.auditLog.create({
    data: { userId, action: "DEPOSIT_REQUESTED", meta: { currency, network, amount, txId: txIdClean, provider: input.provider ?? "MANUAL_CRYPTO", providerReference: input.providerReference ?? null } },
  });
}

/** Idempotent: only a PENDING request can be approved; credit happens at most once. */
export async function approveDeposit(
  adminId: string,
  depositId: string
): Promise<"approved" | "already"> {
  if (!canManageFinances("ADMIN")) throw new FinanceError(403, "FORBIDDEN", "Admin only.");
  return prisma.$transaction(async (tx) => {
    const claim = await tx.depositRequest.updateMany({
      where: { id: depositId, status: "PENDING" },
      data: { status: "APPROVED", adminId, reviewedAt: new Date() },
    });
    if (claim.count === 0) return "already"; // concurrent/retry safe
    const dep = await tx.depositRequest.findUniqueOrThrow({ where: { id: depositId } });

    const w = await lockWallet(tx, dep.userId, dep.currency);
    const balanceAfter = w.balance + dep.amount;
    await tx.wallet.update({ where: { id: w.id }, data: { balance: balanceAfter } });
    await writeLedger(tx, {
      userId: dep.userId, currency: dep.currency, type: "DEPOSIT_CREDIT",
      amount: dep.amount, balanceAfter, reservedAfter: w.reserved,
      reference: dep.id, metadata: { txId: dep.txId, adminId },
    });
    await tx.auditLog.create({
      data: { userId: adminId, action: "DEPOSIT_APPROVED", meta: { depositId, userId: dep.userId, amount: dep.amount, currency: dep.currency } },
    });
    return "approved";
  });
}

export async function rejectDeposit(
  adminId: string,
  depositId: string,
  reason: string
): Promise<"rejected" | "already"> {
  const clean = reason.trim();
  if (!clean) throw new FinanceError(400, "REASON_REQUIRED", "A rejection reason is required.");
  return prisma.$transaction(async (tx) => {
    const claim = await tx.depositRequest.updateMany({
      where: { id: depositId, status: "PENDING" },
      data: { status: "REJECTED", adminId, rejectionReason: clean, reviewedAt: new Date() },
    });
    if (claim.count === 0) return "already";
    await tx.auditLog.create({
      data: { userId: adminId, action: "DEPOSIT_REJECTED", meta: { depositId, reason: clean } },
    });
    return "rejected";
  });
}

export async function cancelDepositRequest(userId: string, depositId: string): Promise<void> {
  const claim = await prisma.depositRequest.updateMany({
    where: { id: depositId, userId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  if (claim.count === 0) throw new FinanceError(409, "NOT_PENDING", "This request can no longer be cancelled.");
}

// ------------------------------------------------------------ withdrawals

export async function createWithdrawalRequest(
  userId: string,
  input: { currency: string; network: string; amount: number; destinationType?: string; destinationValue: string }
): Promise<void> {
  const { currency, network, amount } = input;
  const destination = input.destinationValue.trim();
  const destinationType = (input.destinationType || "BLOCKCHAIN_ADDRESS").trim();
  const net = await prisma.walletNetwork.findUnique({
    where: { currency_network: { currency, network } },
  });
  if (!net || !net.enabled) {
    throw new FinanceError(400, "NETWORK_DISABLED", "This currency/network is not enabled.");
  }
  if (!validDestinationAddress(destination)) {
    throw new FinanceError(400, "BAD_ADDRESS", "Enter a valid destination wallet address.");
  }
  const available = await getAvailableBalance(userId, currency);
  const err = withdrawalInputError({ amount, available, minWithdrawal: net.minWithdrawal });
  if (err) {
    throw new FinanceError(err.includes("Insufficient") ? 402 : 400, err.includes("Insufficient") ? "INSUFFICIENT_FUNDS" : "BAD_AMOUNT", err);
  }

  await prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.create({
      data: { userId, currency, network, amount, destinationType, destinationValue: destination, status: "PENDING" },
    });
    // Re-check + reserve atomically under row lock (prevents concurrent double-spend).
    const w = await lockWallet(tx, userId, currency);
    if (!canReserve(w.balance, w.reserved, amount)) {
      throw new FinanceError(402, "INSUFFICIENT_FUNDS", "Insufficient available balance.");
    }
    const reservedAfter = w.reserved + amount;
    await tx.wallet.update({ where: { id: w.id }, data: { reserved: reservedAfter } });
    await writeLedger(tx, {
      userId, currency, type: "WITHDRAWAL_RESERVE", amount,
      balanceAfter: w.balance, reservedAfter,
      reference: request.id, metadata: { destination, network },
    });
  });
  await prisma.auditLog.create({
    data: { userId, action: "WITHDRAWAL_REQUESTED", meta: { currency, network, amount, destination } },
  });
}

export async function processWithdrawal(adminId: string, withdrawalId: string): Promise<"processing" | "already"> {
  const claim = await prisma.withdrawalRequest.updateMany({
    where: { id: withdrawalId, status: "PENDING" },
    data: { status: "PROCESSING", adminId, processedAt: new Date() },
  });
  if (claim.count === 0) return "already";
  await prisma.auditLog.create({
    data: { userId: adminId, action: "WITHDRAWAL_PROCESSING", meta: { withdrawalId } },
  });
  return "processing";
}

/** Complete: operator has sent the funds externally and records the TXID. */
export async function completeWithdrawal(
  adminId: string,
  withdrawalId: string,
  txId: string
): Promise<"completed" | "already"> {
  const clean = txId.trim();
  if (!clean || clean.length > 128) {
    throw new FinanceError(400, "TXID_REQUIRED", "Enter the transaction ID of the external payout.");
  }
  return prisma.$transaction(async (tx) => {
    const claim = await tx.withdrawalRequest.updateMany({
      where: { id: withdrawalId, status: "PROCESSING" },
      data: { status: "COMPLETED", adminId, txId: clean, completedAt: new Date() },
    });
    if (claim.count === 0) return "already";
    const req = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id: withdrawalId } });

    const w = await lockWallet(tx, req.userId, req.currency);
    if (w.balance < req.amount || w.reserved < req.amount) {
      throw new FinanceError(409, "BALANCE_MISMATCH", "Wallet state does not allow completion.");
    }
    const balanceAfter = w.balance - req.amount;
    const reservedAfter = w.reserved - req.amount;
    await tx.wallet.update({
      where: { id: w.id },
      data: { balance: balanceAfter, reserved: reservedAfter },
    });
    await writeLedger(tx, {
      userId: req.userId, currency: req.currency, type: "WITHDRAWAL_COMPLETED",
      amount: req.amount, balanceAfter, reservedAfter,
      reference: req.id, metadata: { txId: clean, adminId, destination: req.destinationValue },
    });
    await tx.auditLog.create({
      data: { userId: adminId, action: "WITHDRAWAL_COMPLETED", meta: { withdrawalId, txId: clean, amount: req.amount, currency: req.currency } },
    });
    return "completed";
  });
}

/** Reject or user-cancel: release the reserved funds back to available. */
export async function releaseWithdrawal(
  actor: { userId: string; isAdmin: boolean },
  withdrawalId: string,
  reason: string,
  kind: "REJECTED" | "CANCELLED"
): Promise<"released" | "already"> {
  const clean = (reason || (kind === "CANCELLED" ? "Cancelled by user" : "")).trim();
  if (kind === "REJECTED" && !clean) {
    throw new FinanceError(400, "REASON_REQUIRED", "A rejection reason is required.");
  }
  return prisma.$transaction(async (tx) => {
        const claim = await tx.withdrawalRequest.updateMany({
      where:
        kind === "REJECTED"
          ? { id: withdrawalId, status: { in: ["PENDING", "PROCESSING"] as any } }
          : { id: withdrawalId, userId: actor.userId, status: "PENDING" },
      data: { status: kind as any, rejectionReason: clean || null, adminId: actor.isAdmin ? actor.userId : null },
    });

    if (claim.count === 0) return "already";

    const req = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id: withdrawalId } });
    const w = await lockWallet(tx, req.userId, req.currency);
    if (w.reserved < req.amount) {
      throw new FinanceError(409, "RESERVED_MISMATCH", "Reserved funds mismatch.");
    }
    const reservedAfter = w.reserved - req.amount;
    await tx.wallet.update({ where: { id: w.id }, data: { reserved: reservedAfter } });
    await writeLedger(tx, {
      userId: req.userId, currency: req.currency, type: "WITHDRAWAL_RELEASE",
      amount: req.amount, balanceAfter: w.balance, reservedAfter,
      reference: req.id, metadata: { reason: clean, by: actor.isAdmin ? "admin" : "user" },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: kind === "REJECTED" ? "WITHDRAWAL_REJECTED" : "WITHDRAWAL_CANCELLED",
        meta: { withdrawalId, reason: clean, amount: req.amount, currency: req.currency },
      },
    });
    return "released";
  });
}

// ------------------------------------------------------- wallet settings

export async function upsertNetwork(
  adminId: string,
  input: {
    id?: string;
    currency: string;
    network: string;
    displayName: string;
    depositAddress: string;
    minDeposit: number;
    minWithdrawal: number;
    enabled: boolean;
  }
): Promise<void> {
  const data = {
    currency: input.currency.trim().toUpperCase(),
    network: input.network.trim().toUpperCase(),
    displayName: input.displayName.trim() || `${input.currency} ${input.network}`,
    depositAddress: input.depositAddress.trim(),
    minDeposit: Math.max(0, Math.round(input.minDeposit)),
    minWithdrawal: Math.max(0, Math.round(input.minWithdrawal)),
    enabled: input.enabled,
  };
  if (!data.depositAddress || data.depositAddress.length > 128) {
    throw new FinanceError(400, "BAD_ADDRESS", "Enter a valid deposit address.");
  }
  if (input.id) {
    await prisma.walletNetwork.update({ where: { id: input.id }, data });
  } else {
    await prisma.walletNetwork.create({ data });
  }
  await prisma.auditLog.create({
    data: { userId: adminId, action: "ADMIN_WALLET_NETWORK", meta: { ...data, id: input.id ?? null } },
  });
}

export async function setNetworkEnabled(adminId: string, id: string, enabled: boolean): Promise<void> {
  await prisma.walletNetwork.update({ where: { id }, data: { enabled } });
  await prisma.auditLog.create({
    data: { userId: adminId, action: "ADMIN_WALLET_NETWORK_TOGGLE", meta: { id, enabled } },
  });
}
