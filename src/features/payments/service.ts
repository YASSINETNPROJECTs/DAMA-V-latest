import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createBinancePayOrder, queryBinancePayOrder } from "./binancePay";

function appUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!url) throw new Error("APP_URL/NEXT_PUBLIC_APP_URL is required for Binance Pay return URLs.");
  return url.replace(/\/$/, "");
}

function makeTradeNo() {
  return `DAMA${Date.now()}${Math.random().toString(36).slice(2, 10).toUpperCase()}`.slice(0, 32);
}

export async function createBinanceDepositOrder(userId: string, amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Invalid deposit amount.");
  const idempotencyKey = `binance-deposit:${userId}:${crypto.randomUUID()}`;
  if (process.env.REAL_MONEY_ENABLED !== "true") throw new Error("Real-money payments are disabled by configuration.");
  const flag = await prisma.featureFlag.findUnique({ where: { key: "real_money" } });
  if (flag && !flag.enabled) throw new Error("Real-money payments are disabled by the platform feature flag.");
  const method = await prisma.paymentMethod.findFirst({
    where: { code: "BINANCE_PAY_USDT", enabled: true, type: "BINANCE_PAY", currency: "USDT" },
  });
  if (!method) throw new Error("Binance Pay is not enabled for USDT.");

  const deposit = await prisma.depositRequest.create({
    data: { userId, currency: "USDT", network: "BINANCE_PAY", amount, txId: null, provider: "BINANCE_PAY", status: "PENDING" },
  });
  const merchantTradeNo = makeTradeNo();
  let order;
  try {
    order = await createBinancePayOrder({
      merchantTradeNo,
      amount: String(amount),
      currency: "USDT",
      referenceGoodsId: deposit.id,
      goodsName: "DAMA USDT Wallet Deposit",
      goodsDetail: `Wallet deposit ${deposit.id}`,
      returnUrl: `${appUrl()}/wallet?payment=success`,
      cancelUrl: `${appUrl()}/wallet?payment=cancelled`,
      webhookUrl: process.env.BINANCE_PAY_WEBHOOK_URL || `${appUrl()}/api/payments/binance/webhook`,
      userId,
    });
  } catch (error) {
    await prisma.depositRequest.updateMany({ where: { id: deposit.id, status: "PENDING" }, data: { status: "CANCELLED", rejectionReason: "Provider order creation failed." } });
    throw error;
  }

  const payment = await prisma.paymentOrder.create({
    data: {
      userId,
      paymentMethodId: method.id,
      depositRequestId: deposit.id,
      provider: "BINANCE_PAY",
      merchantTradeNo,
      providerOrderId: order.prepayId,
      providerReference: order.prepayId,
      currency: "USDT",
      amount: new Prisma.Decimal(String(amount)),
      status: "PENDING",
      checkoutUrl: order.checkoutUrl,
      qrContent: order.qrContent,
      qrCodeLink: order.qrcodeLink,
      deeplink: order.deeplink,
      universalUrl: order.universalUrl,
      expiresAt: new Date(order.expireTime),
      idempotencyKey,
      metadata: { provider: "BINANCE_PAY", depositRequestId: deposit.id },
    },
  });
  return payment;
}

export async function reconcileBinancePayment(paymentId: string) {
  const payment = await prisma.paymentOrder.findUnique({ where: { id: paymentId }, include: { depositRequest: true } });
  if (!payment || payment.provider !== "BINANCE_PAY") throw new Error("Payment order not found.");
  const remote = await queryBinancePayOrder({ merchantTradeNo: payment.merchantTradeNo });
  const remoteStatus = String(remote.status || "");

  if (remoteStatus !== "PAID") {
    const mapped = remoteStatus === "CANCELED" || remoteStatus === "EXPIRED" ? "EXPIRED" : remoteStatus === "ERROR" ? "FAILED" : "PENDING";
    await prisma.paymentOrder.update({ where: { id: payment.id }, data: { lastProviderStatus: remoteStatus, status: mapped } });
    return { status: remoteStatus, credited: false };
  }

  const remoteAmount = String(remote.totalFee ?? "");
  const remoteCurrency = String(remote.currency ?? "");
  if (remoteCurrency !== payment.currency || new Prisma.Decimal(remoteAmount).comparedTo(payment.amount) !== 0) {
    throw new Error("Provider amount/currency mismatch; payment was NOT credited.");
  }

  const transactionId = String(remote.transactionId || "");
  if (!transactionId) throw new Error("Paid Binance order has no transactionId yet.");

  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.paymentOrder.updateMany({ where: { id: payment.id, status: { in: ["CREATED", "PENDING"] } }, data: { status: "PAID", providerReference: transactionId, lastProviderStatus: remoteStatus, paidAt: new Date() } });
    if (claim.count === 0) return { credited: false };
    const dep = await tx.depositRequest.findUniqueOrThrow({ where: { id: payment.depositRequestId! } });
    const depClaim = await tx.depositRequest.updateMany({ where: { id: dep.id, status: "PENDING" }, data: { status: "APPROVED", reviewedAt: new Date() } });
    if (depClaim.count === 0) return { credited: false };
    const wallet = await tx.wallet.upsert({ where: { userId_currency: { userId: dep.userId, currency: dep.currency } }, update: {}, create: { userId: dep.userId, currency: dep.currency, balance: 0, reserved: 0 } });
    const balanceAfter = wallet.balance + dep.amount;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
    await tx.ledgerEntry.create({ data: { userId: dep.userId, currency: dep.currency, type: "DEPOSIT_CREDIT", amount: dep.amount, balanceAfter, reservedAfter: wallet.reserved, reference: dep.id, metadata: { provider: "BINANCE_PAY", merchantTradeNo: payment.merchantTradeNo, transactionId } } });
    await tx.auditLog.create({ data: { userId: dep.userId, action: "BINANCE_PAY_DEPOSIT_CREDITED", meta: { paymentId: payment.id, depositId: dep.id, transactionId, amount: dep.amount, currency: dep.currency } } });
    return { credited: true };
  });
  return { status: remoteStatus, ...result };
}
