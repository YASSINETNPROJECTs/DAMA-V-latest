import crypto from "node:crypto";

const DEFAULT_BASE_URL = "https://bpay.binanceapi.com";

export class BinancePayError extends Error {
  constructor(public code: string, message: string, public providerBody?: unknown) {
    super(message);
    this.name = "BinancePayError";
  }
}

function config() {
  const enabled = process.env.BINANCE_PAY_ENABLED === "true";
  const certSn = process.env.BINANCE_PAY_CERT_SN?.trim();
  const secret = process.env.BINANCE_PAY_SECRET_KEY?.trim();
  const baseUrl = (process.env.BINANCE_PAY_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  if (!enabled) throw new BinancePayError("DISABLED", "Binance Pay is disabled.");
  if (!certSn || !secret) throw new BinancePayError("NOT_CONFIGURED", "Binance Pay credentials are not configured.");
  return { certSn, secret, baseUrl };
}

function nonce() {
  return crypto.randomBytes(16).toString("hex"); // 32 ASCII chars
}

export function signBinancePayPayload(body: string, timestamp: string, nonceValue: string, secret: string) {
  const payload = `${timestamp}\n${nonceValue}\n${body}\n`;
  return crypto.createHmac("sha512", secret).update(payload, "utf8").digest("hex").toUpperCase();
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { certSn, secret, baseUrl } = config();
  const raw = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const n = nonce();
  const signature = signBinancePayPayload(raw, timestamp, n, secret);

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "BinancePay-Timestamp": timestamp,
      "BinancePay-Nonce": n,
      "BinancePay-Certificate-SN": certSn,
      "BinancePay-Signature": signature,
    },
    body: raw,
    cache: "no-store",
  });

  const json = (await response.json()) as T & { status?: string; code?: string; errorMessage?: string };
  if (!response.ok || json.status !== "SUCCESS" || json.code !== "000000") {
    throw new BinancePayError(json.code || `HTTP_${response.status}`, json.errorMessage || "Binance Pay request failed.", json);
  }
  return json;
}

export interface BinanceOrderResult {
  prepayId: string;
  terminalType: string;
  expireTime: number;
  qrcodeLink: string;
  qrContent: string;
  checkoutUrl: string;
  deeplink: string;
  universalUrl: string;
  currency: string;
  totalFee: string;
}

export async function createBinancePayOrder(input: {
  merchantTradeNo: string;
  amount: string;
  currency: "USDT";
  referenceGoodsId: string;
  goodsName: string;
  goodsDetail?: string;
  returnUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  userId?: string;
}): Promise<BinanceOrderResult> {
  const body = {
    env: { terminalType: "WEB" },
    merchantTradeNo: input.merchantTradeNo,
    orderAmount: input.amount,
    currency: input.currency,
    goods: {
      goodsType: "02",
      goodsCategory: "6000",
      referenceGoodsId: input.referenceGoodsId,
      goodsName: input.goodsName.replace(/["\\]/g, "").slice(0, 256),
      goodsDetail: input.goodsDetail?.slice(0, 256),
      goodsUnitAmount: { currency: input.currency, amount: input.amount },
      goodsQuantity: "1",
    },
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
    orderExpireTime: Date.now() + 60 * 60 * 1000,
    webhookUrl: input.webhookUrl,
    merchantAccountNo: input.userId?.slice(0, 64),
    passThroughInfo: input.referenceGoodsId,
  };
  const response = await request<{ status: string; code: string; data: BinanceOrderResult }>(
    "/binancepay/openapi/v2/order",
    body,
  );
  return response.data;
}

export async function queryBinancePayOrder(input: { merchantTradeNo?: string; prepayId?: string }) {
  if (!input.merchantTradeNo && !input.prepayId) throw new BinancePayError("BAD_QUERY", "merchantTradeNo or prepayId is required.");
  const response = await request<{ status: string; code: string; data: Record<string, unknown> }>(
    "/binancepay/openapi/order/query",
    { merchantTradeNo: input.merchantTradeNo ?? null, prepayId: input.prepayId ?? null },
  );
  return response.data;
}

export async function getBinancePayPublicKey() {
  const response = await request<{ status: string; code: string; data: Array<{ certSn: string; certPublic: string }> }>(
    "/binancepay/openapi/certificates",
    {},
  );
  const wanted = process.env.BINANCE_PAY_CERT_SN?.trim();
  const cert = response.data.find((x) => !wanted || x.certSn === wanted) ?? response.data[0];
  if (!cert?.certPublic) throw new BinancePayError("NO_CERT", "Binance Pay public certificate was not returned.");
  return cert.certPublic;
}

export async function verifyBinanceWebhook(input: {
  rawBody: string;
  timestamp: string;
  nonce: string;
  signature: string;
}) {
  if (!input.rawBody || !input.timestamp || !input.nonce || !input.signature) return false;
  const publicKey = await getBinancePayPublicKey();
  const payload = `${input.timestamp}\n${input.nonce}\n${input.rawBody}\n`;
  const verify = crypto.createVerify("SHA256");
  verify.update(payload, "utf8");
  verify.end();
  return verify.verify(publicKey, Buffer.from(input.signature, "base64"));
}
