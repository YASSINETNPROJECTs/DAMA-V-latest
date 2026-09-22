import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { queryBinancePayOrder, verifyBinanceWebhook } from "@/features/payments/binancePay";
import { reconcileBinancePayment } from "@/features/payments/service";

async function verify(request: Request, raw: string) {
  const timestamp = request.headers.get("BinancePay-Timestamp") || "";
  const nonce = request.headers.get("BinancePay-Nonce") || "";
  const signature = request.headers.get("BinancePay-Signature") || "";
  return verifyBinanceWebhook({ rawBody: raw, timestamp, nonce, signature });
}

export async function POST(request: Request) {
  const raw = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw) as Record<string, unknown>; } catch { return NextResponse.json({ returnCode: "FAIL", returnMessage: "Invalid JSON" }, { status: 400 }); }
  if (!(await verify(request, raw))) return NextResponse.json({ returnCode: "FAIL", returnMessage: "Invalid signature" }, { status: 401 });

  const eventKey = String(payload.bizIdStr || payload.bizId || payload.data || crypto.createHash("sha256").update(raw).digest("hex"));
  try {
    await prisma.paymentWebhookEvent.create({ data: { provider: "BINANCE_PAY", eventKey, eventType: String(payload.bizType || "ORDER"), signature: request.headers.get("BinancePay-Signature") || "",     payload: payload as any
 } });
  } catch (e) {
    if (!(e instanceof Error && "code" in e && (e as {code?: string}).code === "P2002")) throw e;
    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: null });
  }

  try {
    const data = typeof payload.data === "string" ? JSON.parse(payload.data) as Record<string, unknown> : (payload.data as Record<string, unknown> | undefined);
    const merchantTradeNo = String(data?.merchantTradeNo || "");
    const prepayId = String(data?.prepayId || "");
    if (!merchantTradeNo && !prepayId) throw new Error("Missing Binance order reference.");
    const remote = await queryBinancePayOrder({ merchantTradeNo: merchantTradeNo || undefined, prepayId: prepayId || undefined });
    const payment = await prisma.paymentOrder.findFirst({ where: { provider: "BINANCE_PAY", OR: [{ merchantTradeNo: String(remote.merchantTradeNo || merchantTradeNo) }, { providerOrderId: String(remote.prepayId || prepayId) }] } });
    if (!payment) throw new Error("Local payment order not found.");
    await reconcileBinancePayment(payment.id);
    await prisma.paymentWebhookEvent.update({ where: { eventKey }, data: { processedAt: new Date(), success: true } });
    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: null });
  } catch (error) {
    await prisma.paymentWebhookEvent.update({ where: { eventKey }, data: { processedAt: new Date(), success: false, error: error instanceof Error ? error.message : "Unknown error" } }).catch(() => undefined);
    // A non-success response tells Binance to retry. This is intentional: financial credit is never acknowledged before reconciliation succeeds.
    return NextResponse.json({ returnCode: "FAIL", returnMessage: "Temporary processing failure" }, { status: 500 });
  }
}
