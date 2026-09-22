-- Finance Phase 2: provider orchestration + Binance Pay readiness
ALTER TABLE "deposit_requests" ALTER COLUMN "txId" DROP NOT NULL;
ALTER TABLE "deposit_requests" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'MANUAL_CRYPTO';
ALTER TABLE "deposit_requests" ADD COLUMN "providerReference" TEXT;

ALTER TABLE "withdrawal_requests" ADD COLUMN "destinationType" TEXT NOT NULL DEFAULT 'BLOCKCHAIN_ADDRESS';
ALTER TABLE "withdrawal_requests" ADD COLUMN "destinationValue" TEXT;
UPDATE "withdrawal_requests" SET "destinationValue" = "destinationAddress" WHERE "destinationValue" IS NULL;
ALTER TABLE "withdrawal_requests" ALTER COLUMN "destinationValue" SET NOT NULL;
ALTER TABLE "withdrawal_requests" ADD COLUMN "provider" TEXT;
ALTER TABLE "withdrawal_requests" ADD COLUMN "providerReference" TEXT;
ALTER TABLE "withdrawal_requests" ALTER COLUMN "txId" DROP NOT NULL;
ALTER TABLE "withdrawal_requests" DROP COLUMN "destinationAddress";

CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED','PENDING','PAID','FAILED','CANCELED','EXPIRED','REFUNDED');
CREATE TYPE "PaymentMethodType" AS ENUM ('BINANCE_PAY','CRYPTO_MANUAL');

CREATE TABLE "payment_methods" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "PaymentMethodType" NOT NULL,
  "currency" TEXT NOT NULL,
  "network" TEXT,
  "displayName" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");
CREATE INDEX "payment_methods_currency_enabled_idx" ON "payment_methods"("currency","enabled");

CREATE TABLE "payment_orders" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentMethodId" TEXT NOT NULL,
  "depositRequestId" TEXT,
  "provider" TEXT NOT NULL,
  "merchantTradeNo" TEXT NOT NULL,
  "providerOrderId" TEXT,
  "providerReference" TEXT,
  "currency" TEXT NOT NULL,
  "amount" DECIMAL(36,8) NOT NULL,
  "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
  "checkoutUrl" TEXT,
  "qrContent" TEXT,
  "qrCodeLink" TEXT,
  "deeplink" TEXT,
  "universalUrl" TEXT,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "lastProviderStatus" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_orders_depositRequestId_key" ON "payment_orders"("depositRequestId");
CREATE UNIQUE INDEX "payment_orders_merchantTradeNo_key" ON "payment_orders"("merchantTradeNo");
CREATE UNIQUE INDEX "payment_orders_providerOrderId_key" ON "payment_orders"("providerOrderId");
CREATE UNIQUE INDEX "payment_orders_idempotencyKey_key" ON "payment_orders"("idempotencyKey");
CREATE INDEX "payment_orders_userId_createdAt_idx" ON "payment_orders"("userId","createdAt");
CREATE INDEX "payment_orders_provider_status_idx" ON "payment_orders"("provider","status");
CREATE INDEX "payment_orders_providerReference_idx" ON "payment_orders"("providerReference");
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_depositRequestId_fkey" FOREIGN KEY ("depositRequestId") REFERENCES "deposit_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventType" TEXT,
  "signature" TEXT,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "success" BOOLEAN NOT NULL DEFAULT false,
  "error" TEXT,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_webhook_events_eventKey_key" ON "payment_webhook_events"("eventKey");
CREATE INDEX "payment_webhook_events_provider_receivedAt_idx" ON "payment_webhook_events"("provider","receivedAt");

ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_txId_key2" UNIQUE ("txId");
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_destinationValue_check" CHECK (length("destinationValue") > 0);
