# DAMA — Competitive Dama/Checkers Arena

DAMA is a player-vs-player competitive platform for English draughts
(checkers). Players pick a stake, get paired with a comparable opponent,
compete on a server-authoritative board, and climb an Elo ladder.

DAMA never plays against users, never determines winners, and never
manipulates results — the game engine decides every match according to the
documented rules. DAMA's revenue is a disclosed platform fee on each staked
pot. This is a skill-based competitive service, not a casino.

## What's in this build

- **Accounts** — registration, login, bcrypt-hashed passwords, httpOnly
  session cookies, protected pages, role-based admin access.
- **Game** — English draughts engine (mandatory capture, multi-jump,
  crowning, 40-quiet-ply draw), unit-tested. Exact rules:
  `src/features/game/RULES.md`.
- **Realtime matches** — Socket.io on a single Node process (`server.js`),
  live rooms with clocks, presence, reconnect restore, disconnect timeout.
- **Matchmaking** — exact stake first, then an expanding rating/level/XP
  window with a hard fairness cap. In-memory queue (single process; migrate
  to Redis/Postgres for horizontal scale).
- **Escrow** — both stakes are **reserved** atomically when a staked match
  is created. Reserved funds cannot be withdrawn or re-staked.
- **Settlement** — idempotent and exactly-once: winner payout = pot − fee,
  fee recorded as platform revenue, draws refund both stakes. Atomic
  `settledAt` claim + wallet row locks.
- **Ratings** — Elo (start 1000, K=32), XP levels, streaks, leaderboards.
- **Wallet** — total / available / reserved balances, full append-only
  ledger, manual operator-controlled crypto deposits and withdrawals.
- **Admin** — control center: users, matches, deposits, withdrawals, wallet
  settings, ledger, revenue, audit log, platform settings.

## The financial system (manual, operator-controlled)

**There is no Binance API, no blockchain API, no automatic deposit
detection and no automatic payout.** The operator controls the external
wallet/exchange manually. The website manages internal accounting and the
request workflow only. The architecture (adapters, ledger, request states)
is designed so automatic providers could be added later without rewriting
the financial core.

### Deposits
1. User opens **Wallet → Deposit**, picks an enabled currency/network.
   The deposit address comes **from the database (admin-configured)** —
   never from code.
2. User sends crypto externally, then submits currency, network, amount
   and TXID. Status: `PENDING`. **Nothing is credited yet.**
3. Admin verifies the transaction externally, then **Approves** or
   **Rejects** (reason required). Approval credits the balance exactly
   once — TXID is unique and double-approval is blocked by a guarded
   status claim.

### Withdrawals
1. User requests amount + currency/network + destination address.
   Funds are **reserved immediately** (available drops, total unchanged).
2. Admin reviews, optionally marks `PROCESSING`, then **sends the crypto
   externally** and completes the request by entering the payout TXID
   (balance decreases, reservation released).
3. Rejection (or user cancel while pending) **releases the reservation**
   back to available. Reason recorded.

Every balance-changing operation writes one ledger entry
(type, amount, balanceAfter, reservedAfter, reference) inside the same
database transaction, with the wallet row locked (`SELECT … FOR UPDATE`).
Concurrent requests, retries, refreshes and double-clicks are safe by
construction — not by frontend guards.

### Wallet settings (admin)
Currency/network rails with deposit address, minimum deposit, minimum
withdrawal, display name and enabled flag — e.g. `USDT/TRC20`,
`USDT/ERC20`, `USDC/ERC20`, `BTC/Bitcoin`. Multiple rails supported.

### Amounts
All amounts are **integer units** of the given currency (no floats).
Sub-unit precision (e.g. satoshi/wei-style decimals) is a future migration
to `Decimal` columns.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma + PostgreSQL ·
Socket.io (single Node process via `server.js`) · Zod · bcryptjs · Vitest.

## Getting started

```bash
npm install
cp .env.example .env          # set DATABASE_URL + SESSION_SECRET
npx prisma db push            # create tables
npm run db:seed               # demo users (password DamaDemo2026!)
npm run dev                   # dev (no sockets; client polls)
npm test                      # engine + finance + settlement tests
npm run build && npm start    # production with realtime
```

## Demo accounts (seeded)

`nadia` (ADMIN), `yusuf`, `amina`, `karim`, `leyla`, `omar` —
`<name>@dama.demo`, password `DamaDemo2026!`. Wallets start empty;
deposits require admin approval, so sign in as `nadia` to approve them in
`/admin/deposits`.

## Deployment (Render + Neon)

- Neon: create a project, copy the pooled `DATABASE_URL`.
- Render → Web Service → your repo:
  - **Build**: `npm install && npx prisma db push && npm run db:seed && npm run build`
  - **Start**: `npm start` (runs `server.js` — Next + Socket.io, one process)
  - **Env**: `DATABASE_URL`, `SESSION_SECRET`, `DEMO_MODE=false`,
    `REAL_MONEY_ENABLED=false`.
- After deploy, sign in as `nadia` → **Admin → Wallet settings** and create
  your first currency/network rail with your deposit address. Then
  **Platform** to set the fee.

## Security notes

- Server-side role checks on every admin/financial action; all audited.
- httpOnly, sameSite=lax session cookies; bcrypt password hashing.
- Zod validation on all inputs; all financial math server-side.
- Idempotency: guarded status claims + unique TXID + atomic settlement.
- KYC is a **simulated provider stub** (not real identity verification) —
  the adapter interface is where a licensed provider would plug in.
- No private keys, seed phrases, or exchange credentials exist anywhere in
  this repository. The operator's wallet is external to the app.

## Honest limitations

- Payments are **manual**: withdrawal speed depends on operator processing
  and external network/exchange conditions. Nothing is guaranteed.
- Matchmaking queue is in-memory (single process).
- KYC is not real. Amounts are integer units.
- Threefold-repetition/insufficient-material draws are not implemented
  (the 40-quiet-ply rule is the only automatic draw).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (polling fallback, no sockets) |
| `npm run build` | Prisma generate + production build |
| `npm start` | Custom server: Next + Socket.io, one process |
| `npm test` | Vitest (engine, finance logic, settlement) |
| `npm run db:push` | Push schema |
| `npm run db:seed` | Seed demo users + flags |
\n\n## Finance Hardening Phase 2 — Binance Pay + payment orchestration\n\nThis build adds a provider-agnostic payment layer and Binance Pay V2 integration scaffolding. Binance Pay credentials are server-only environment variables. Deposits are never credited merely because a browser returned to the site: the webhook is signature-checked, the order is queried against Binance, the amount/currency are matched to the local order, and the internal credit is idempotent inside one database transaction.\n\n### Binance Pay configuration\n\nSet `BINANCE_PAY_ENABLED=true`, `BINANCE_PAY_CERT_SN`, `BINANCE_PAY_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, and `BINANCE_PAY_WEBHOOK_URL` in Render. Keep all Binance secrets out of GitHub. Enable the `BINANCE_PAY_USDT` payment method in the database/admin configuration.\n\nThe integration uses Binance Pay's current V2 create-order endpoint, HMAC-SHA512 request signing, and the order-query API for reconciliation. See the official Binance Pay developer documentation for merchant onboarding and credential setup.\n\n### Important\n\nThis ZIP is an implementation/hardening release, not a claim that a real-money service is legally or operationally ready for public launch. Provider credentials, merchant approval, HTTPS webhook reachability, database migration, end-to-end payment testing, reconciliation procedures, and applicable licensing/compliance must be completed before live funds are accepted.\n
### Database migration

This release includes a Prisma migration under `prisma/migrations/20260921_finance_phase2`. On the test database run `npx prisma migrate deploy` (or `npm run db:push` for a disposable test database). Do not reset a production database.
