# Finance Hardening — Phase 1

This phase makes only conservative financial-safety changes. No database migration is included.

## Changes

1. Match settlement claim (`settledAt`) is now inside the same Prisma transaction as ratings, wallet settlement, ledger writes, revenue, and audit logging. If settlement fails, the claim rolls back and a safe retry remains possible.
2. Match escrow creation and both players' stake reservations now happen inside one database transaction. If either reservation fails, the match and any earlier reservation roll back together.
3. Match wallet/ledger/revenue settlement logic was moved behind the Finance service (`settleMatchEscrowTx`). Competitive code no longer directly mutates wallet, ledger, or platform revenue.
4. Match wallet locks use deterministic user ordering to reduce deadlock risk.
5. Withdrawal rejection/cancellation no longer uses `Math.max(0, reserved - amount)`; a reservation mismatch now fails the transaction instead of silently masking an accounting inconsistency.
6. Added a small settlement math regression test.

## Intentionally NOT changed

- Prisma schema / production database
- payment provider integrations
- Binance APIs or blockchain APIs
- currency model
- TND activation
- authentication
- game rules / board engine
- UI redesign

## Validation note

The uploaded project did not contain `node_modules`, so the full `npm test` and production build could not be executed in this environment. The code was statically inspected after the changes. Before deployment, run `npm ci`, `npm test`, and `npm run build` in the repository/Render environment.
