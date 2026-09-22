# DAMA Finance Professional Phase 2

## What this release adds

- Provider-agnostic `PaymentMethod` abstraction.
- `PaymentOrder` with provider IDs, checkout/QR links, status, expiry, Decimal amount, unique merchant trade number and unique idempotency key.
- Durable `PaymentWebhookEvent` inbox for idempotent webhook handling and audit/retry visibility.
- Binance Pay V2 create-order integration.
- Binance Pay order-query reconciliation before wallet credit.
- Binance Pay request HMAC-SHA512 signing.
- Binance Pay webhook RSA-SHA256 verification using the merchant certificate returned by Binance Pay.
- Amount and currency matching between the provider order and the local payment order.
- Atomic, exactly-once internal credit guarded by payment/deposit status claims.
- Binance-hosted checkout URL, deep link and provider QR image link in the user wallet.
- Admin payment operations page with manual provider reconciliation.
- Admin enable/disable controls for payment methods.
- Withdrawal destination abstraction (`destinationType` + `destinationValue`).
- Optional manual deposit TXID for provider-based payments while retaining uniqueness when a TXID exists.
- Prisma migration preserving existing withdrawal destination data.
- Server-only Binance secrets in `.env` configuration.

## Binance Pay flow

`User -> create order -> Binance hosted checkout/QR -> Binance webhook -> verify webhook -> query Binance order -> compare amount/currency -> atomic internal credit -> ledger + audit`

A browser redirect is never treated as proof of payment.

## Required live configuration

- `REAL_MONEY_ENABLED=true`
- database `real_money` feature flag enabled
- payment method `BINANCE_PAY_USDT` enabled
- `BINANCE_PAY_ENABLED=true`
- `BINANCE_PAY_CERT_SN`
- `BINANCE_PAY_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`
- `BINANCE_PAY_WEBHOOK_URL`
- public HTTPS access to `/api/payments/binance/webhook`
- approved Binance Pay merchant account and applicable provider onboarding

Do not commit credentials to GitHub.

## Current scope limitation

The existing internal wallet/game ledger still uses integer units for its established accounting model. Binance Pay provider orders use Decimal(36,8) and are currently restricted by the application deposit form to whole USDT units so provider settlement cannot silently round into the wallet. A future monetary migration can introduce per-currency minor-unit scales across the entire wallet/game ledger; it should be a separate migration with reconciliation, not a silent type change.

This release is therefore a hardened implementation layer, not a claim of legal/compliance approval or guaranteed production readiness. Live funds require end-to-end merchant testing, HTTPS webhook verification, reconciliation procedures, operational controls, and all applicable licensing/compliance.
