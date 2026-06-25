# PMX Production Polymarket Order Routing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the current preview-only PMX trading platform to production readiness, with real user-signed orders packaged and submitted to Polymarket CLOB V2.

**Architecture:** Keep the current production path non-custodial. The browser owns wallet signing, the API owns validation, persistence, routing, and CLOB submission using official Polymarket SDK boundaries. Real trading is enabled only after wallet, Deposit Wallet, pUSD balance, allowance, region, builder attribution, and risk gates all pass. A company-managed Platform Wallet is recorded as a later product extension, but it is not part of the current Phase 2 implementation.

**Tech Stack:** Next.js, React, TypeScript, NestJS, Prisma, PostgreSQL, `@polymarket/clob-client-v2`, `viem`, Polymarket Builder Relayer SDK, Playwright, Jest, Vitest.

---

## Official Constraints To Follow

| Area | Required Direction |
|---|---|
| CLOB version | Use CLOB V2 production host `https://clob.polymarket.com`. Do not submit V1 orders. |
| SDK | Continue behind a local adapter with `@polymarket/clob-client-v2` first because it is already installed and documented for trading quickstart. Keep the adapter narrow so it can move to `Polymarket/ts-sdk` if that unified SDK becomes the stronger production path. |
| Auth | L1 signer creates or derives L2 API credentials. L2 credentials authenticate order/cancel/balance requests, but user orders still require a signed order payload. |
| Wallet path | For the current implementation, use the user's connected owner wallet + Polymarket Deposit Wallet + `signatureType = POLY_1271` and `funderAddress = depositWalletAddress`. |
| Builder attribution | Attach `builderCode` as a `bytes32` field on every submitted order. Do not rely on old separate HMAC attribution headers. |
| Funding | Deposit wallet must hold pUSD and have required trading approvals. Users may use the Polymarket wallet path directly for deposit and withdrawal until the later Platform Wallet feature is built. |
| Future Platform Wallet | Later, add one company-managed Platform Wallet per user and restrict transfers to that user's `PlatformWallet <-> DepositWallet`. This is a deferred plan item, not current Phase 2 scope. |
| Error handling | Handle 400/401/404/425/429/500/503 with classified retry or user-facing failure reasons. |

## Phase 0: Production Readiness Baseline

**Purpose:** Freeze the current preview-only baseline and make production risk explicit before touching real order flow.

**Development details:**

- [x] Add an `ORDER_ROUTER_MODE` env variable with values `preview`, `paper`, `live`.
- [x] Default all environments to `preview`.
- [x] Add `POLYMARKET_CLOB_HOST`, `POLYMARKET_CHAIN_ID`, `POLYMARKET_BUILDER_CODE`, `POLYMARKET_RELAYER_API_KEY`, `POLYMARKET_RPC_URL`.
- [x] Add startup validation that refuses `live` if required secrets are missing.
- [x] Add an admin-visible environment panel showing mode, CLOB host, chain ID, builder code status, relayer configured status, and live trading enabled status.
- [x] Keep current `/orders/preview` behavior unchanged.

**Acceptance criteria:**

- [x] Local dev starts in `preview`.
- [x] `ORDER_ROUTER_MODE=live` fails startup if CLOB host, chain ID, builder code, relayer credentials, or RPC URL are missing.
- [x] Admin can see whether the app is in `preview`, `paper`, or `live`.
- [x] No endpoint can submit a real CLOB order unless mode is `live`.

## Phase 1: Official SDK Adapter And CLOB Contract

**Purpose:** Stop scattering Polymarket-specific logic through app code. Put all SDK calls behind one testable adapter.

**Development details:**

- [x] Create `apps/api/src/polymarket/clob-adapter.ts`.
- [x] Create `apps/api/src/polymarket/clob-types.ts` for internal normalized types:
  - `ClobOrderIntent`
  - `ClobSignedOrder`
  - `ClobPostResult`
  - `ClobOpenOrder`
  - `ClobTrade`
  - `ClobBalanceAllowance`
- [x] Implement adapter methods:
  - `createOrDeriveApiKey`
  - `createOrder`
  - `postSignedOrder`
  - `createAndPostOrder` only for server-controlled test signer paths
  - `getOpenOrders`
  - `getOrder`
  - `getTrades`
  - `getBalanceAllowance`
  - `cancelOrder`
- [x] Keep raw SDK response in `rawPolymarketResponse`.
- [x] Map SDK errors into internal error codes:
  - `AUTH_FAILED`
  - `ORDER_REJECTED`
  - `BALANCE_INSUFFICIENT`
  - `ALLOWANCE_MISSING`
  - `MARKET_NOT_FOUND`
  - `RATE_LIMITED`
  - `MATCHING_ENGINE_UNAVAILABLE`
  - `EXCHANGE_PAUSED`

**Acceptance criteria:**

- [x] Unit tests prove every adapter method maps success and failure into stable internal types.
- [x] No order service imports `@polymarket/clob-client-v2` directly.
- [x] Changing SDK package should only require adapter changes.
- [x] Adapter can run against a mock provider in `paper` mode and real SDK in `live` mode.

## Phase 2: Deposit Wallet Lifecycle

**Purpose:** Move from wallet proof to production-compatible Polymarket Deposit Wallet readiness while still allowing users to use their Polymarket wallet path directly for deposit and withdrawal.

**Development details:**

- [x] Add database tables:
  - `DepositWallet`
  - `WalletOperation`
  - `RelayerTransaction`
- [x] Add API endpoints:
  - `POST /wallets/deposit/create-intent`
  - `POST /wallets/deposit/submit-signed-batch`
  - `GET /wallets/deposit/status`
- [x] Integrate Polymarket Builder Relayer SDK types and Deposit Wallet helpers for gasless wallet operations without API-held private keys.
- [x] Browser signs the Deposit Wallet create-wallet batch only after showing the exact action.
- [ ] Add approve exchange and refresh balance cache wallet batch signing with Phase 3 funding checks.
- [x] API submits signed wallet batches to relayer.
- [x] Store relayer transaction status and failure reason.
- [x] Show Deposit Wallet address, owner wallet, relayer tx status, latest sync time, and relayer failure reason in Account; show relayer failure reason in Admin.
- [x] Document the future Platform Wallet path, but do not build it in this phase.

**Acceptance criteria:**

- [x] A logged-in user can create or discover a Deposit Wallet without the API storing a private key.
- [x] API stores Deposit Wallet address and links it to the user.
- [x] Failed relayer submissions are visible in Account and Admin with reason.
- [x] Deposit Wallet creation can be retried idempotently.
- [x] Real order submit remains disabled until Deposit Wallet status is `READY`.

**Deferred Platform Wallet extension:**

- [ ] Later add one company-managed Platform Wallet per user.
- [ ] Do not use a shared platform treasury wallet for user balances or positions.
- [ ] Store only custody provider IDs/key references; never store private keys, mnemonics, raw encrypted keys, or recovery shares.
- [ ] Later restrict platform-mediated transfers to the same user's `PlatformWallet <-> DepositWallet`.
- [ ] Later decide KMS/MPC/embedded-wallet provider and add custody, audit, compliance, and withdrawal controls before implementation.

## Phase 3: pUSD Funding, Balance, Allowance, And Cache Sync

**Purpose:** Make the app know whether the user can actually trade before signing an order.

**Development details:**

- [x] Replace current placeholder `GET /wallets/balance-allowance` with real SDK-backed checks.
- [x] Track:
  - pUSD balance
  - required allowance
  - exchange approval state
  - balance cache updated time
  - minimum order size compliance
- [x] Add `POST /wallets/balance-allowance/refresh`.
- [x] Add UI states:
  - `NO_DEPOSIT_WALLET`
  - `NO_PUSD`
  - `ALLOWANCE_MISSING`
  - `CACHE_STALE`
  - `READY`
- [x] Add funding instructions that let users fund and withdraw through the Polymarket wallet path directly. Do not route funds through a PMX Platform Wallet in this phase.

**Acceptance criteria:**

- [x] If Deposit Wallet has no pUSD, order submit is blocked with `NO_PUSD`.
- [x] If allowance is missing, order submit is blocked with `ALLOWANCE_MISSING`.
- [x] If CLOB balance cache is stale, user can refresh and see updated time.
- [x] `/orders/preview` includes balance and allowance gate details.
- [x] E2E covers each blocking state with mocked funding responses; `WalletFundingService` tests cover mocked SDK/provider responses.

## Phase 4: Signed Order Packaging

**Purpose:** Build the real order package that the user signs and the API can submit.

**Development details:**

- [ ] Add endpoint `POST /orders/signing-intent`.
- [ ] Convert current preview into canonical `ClobOrderIntent`:
  - `tokenID`
  - `price`
  - `size` or market `amount`
  - `side`
  - `orderType`
  - `tickSize`
  - `negRisk`
  - `builderCode`
  - `signatureType = POLY_1271`
  - `funderAddress = depositWalletAddress`
- [ ] Add a deterministic quote freshness check:
  - reject stale quote
  - reject price moved outside slippage
  - reject inactive or closed market
- [ ] Browser receives signing payload from SDK-compatible API response.
- [ ] Browser signs the order using the owner/session signer.
- [ ] Add endpoint `POST /orders/signed` to persist signed payload only.
- [ ] Do not submit to Polymarket in this phase.

**Acceptance criteria:**

- [ ] Signed order contains `signatureType = 3`.
- [ ] Signed order contains Deposit Wallet as funder.
- [ ] Signed order contains configured builder code.
- [ ] Stale quote blocks signing.
- [ ] Signed payload is persisted with `status = SIGNED`.
- [ ] No real CLOB network submit occurs in this phase.

## Phase 5: Paper Submit And Local Order State Machine

**Purpose:** Prove the product, database, and UI order lifecycle before enabling live Polymarket submit.

**Development details:**

- [ ] Add order statuses:
  - `SIGNING_REQUESTED`
  - `SIGNED`
  - `SUBMITTING`
  - `SUBMITTED`
  - `OPEN`
  - `PARTIALLY_FILLED`
  - `FILLED`
  - `CANCEL_REQUESTED`
  - `CANCELLED`
  - `REJECTED`
  - `FAILED`
- [ ] Add `POST /orders/submit`.
- [ ] In `paper` mode, submit to mock CLOB provider.
- [ ] Add reconciliation job:
  - open orders
  - order detail
  - trades/fills
  - cancellation status
- [ ] Add Account and Portfolio order history.
- [ ] Add Admin Orders page with filters and failure reasons.

**Acceptance criteria:**

- [ ] In `paper` mode, a signed order reaches `SUBMITTED` without calling Polymarket.
- [ ] Mock fills update Portfolio positions.
- [ ] Mock rejection stores reason and keeps raw provider response.
- [ ] Cancel flow moves order to `CANCEL_REQUESTED` then `CANCELLED`.
- [ ] E2E covers preview to signed to paper submitted to filled.

## Phase 6: Live CLOB Submit Guarded Rollout

**Purpose:** Enable real Polymarket order submission behind strict gates.

**Development details:**

- [ ] Enable live submit only when:
  - `ORDER_ROUTER_MODE=live`
  - user has Deposit Wallet `READY`
  - pUSD balance is sufficient
  - allowance is sufficient
  - region/risk gate is `READY`
  - builder code is valid bytes32
  - quote freshness passes
  - user confirms final order
- [ ] API submits signed order through CLOB adapter.
- [ ] Persist:
  - Polymarket `orderID`
  - status
  - making/taking amount
  - transaction hashes
  - raw response
  - submitted timestamp
- [ ] Add idempotency key per user/order.
- [ ] Add retry policy:
  - retry `425`, `429`, `500`, `503` with bounded backoff
  - never retry signature, balance, allowance, or validation failures automatically
- [ ] Add kill switch:
  - global live submit disable
  - per-user disable
  - per-market disable

**Acceptance criteria:**

- [ ] Live submit cannot run in `preview` or `paper`.
- [ ] Duplicate submit request with same idempotency key does not create two CLOB orders.
- [ ] Successful live submit stores Polymarket `orderID`.
- [ ] Failed live submit stores normalized error code and raw response.
- [ ] User sees exact submitted status and can navigate to order details.
- [ ] Admin kill switch blocks live submit immediately.

## Phase 7: Cancellation, Reconciliation, And Fills

**Purpose:** Make live orders manageable after submission.

**Development details:**

- [ ] Add endpoints:
  - `GET /orders`
  - `GET /orders/:id`
  - `POST /orders/:id/cancel`
  - `POST /orders/sync`
- [ ] Add scheduled reconciliation worker:
  - fetch open orders
  - fetch order details
  - fetch trades
  - map fills into `Trade`
  - update `Position`
- [ ] Add user channel WebSocket later only after polling is stable.
- [ ] Add Admin reconciliation dashboard.

**Acceptance criteria:**

- [ ] User can cancel an open live order.
- [ ] Cancel failure does not hide original open order.
- [ ] Filled order creates Trade rows.
- [ ] Portfolio positions match fills.
- [ ] Reconciliation is idempotent.
- [ ] Admin can manually trigger reconciliation for one user/order.

## Phase 8: Compliance, Region, Risk, And Abuse Controls

**Purpose:** Prevent production trading where it should not be allowed.

**Development details:**

- [ ] Add region check provider interface.
- [ ] Add risk decision table:
  - `ALLOW_PREVIEW`
  - `ALLOW_SIGN`
  - `ALLOW_SUBMIT`
  - `BLOCK_ALL`
- [ ] Add rate limits:
  - login
  - wallet challenge
  - signing intent
  - submit
  - cancel
- [ ] Add notional limits:
  - per order
  - per user per day
  - per market
- [ ] Add audit logs for every high-risk action:
  - wallet create
  - allowance change
  - signing intent
  - signed payload received
  - live submit
  - cancel
  - admin gate change

**Acceptance criteria:**

- [ ] Blocked region cannot sign or submit.
- [ ] Rate limited submit returns 429 and creates audit event.
- [ ] Over-limit notional blocks submit before signing.
- [ ] Admin can see audit trail for one order end to end.
- [ ] All risk decisions are stored with reason and timestamp.

## Phase 9: Observability And Production Operations

**Purpose:** Make production failures diagnosable without reading database rows manually.

**Development details:**

- [ ] Add structured logs with request ID and order ID.
- [ ] Add metrics:
  - preview count
  - signing intent count
  - signed count
  - submit success/failure
  - CLOB latency
  - relayer latency
  - reconciliation lag
  - stale balance cache count
- [ ] Add Sentry or equivalent error tracking.
- [ ] Add Admin operational pages:
  - Orders
  - Wallets
  - Relayer
  - CLOB Health
  - Builder Attribution
- [ ] Add runbooks:
  - CLOB 503
  - relayer down
  - balance cache stale
  - duplicate submit
  - builder attribution missing

**Acceptance criteria:**

- [ ] Every failed live submit has a searchable request ID.
- [ ] Admin sees live submit success rate and latest failures.
- [ ] Alert fires on repeated CLOB submit failures.
- [ ] Runbook exists for each production failure class.

## Phase 10: Security Review And Launch Gates

**Purpose:** Finish production hardening before public live trading.

**Development details:**

- [ ] Threat model wallet signing and signed order submission.
- [ ] Verify API never stores private keys.
- [ ] Verify signed payload cannot be tampered with after user confirmation.
- [ ] Add CSRF/replay/idempotency checks for submit endpoints.
- [ ] Encrypt sensitive API credentials at rest if stored.
- [ ] Rotate secrets and document rotation.
- [ ] Run load test for preview/sign/submit paths.
- [ ] Run staged rollout:
  - internal only
  - allowlist users
  - small notional cap
  - full notional cap

**Acceptance criteria:**

- [ ] Security review has no unresolved critical or high findings.
- [ ] Live trading is allowlist-only at first launch.
- [ ] First production submit uses a small capped order.
- [ ] Reconciliation confirms first order status from Polymarket.
- [ ] Builder trade query confirms attribution for matched trade.
- [ ] Rollback means switching `ORDER_ROUTER_MODE` from `live` to `paper` or `preview`.

## Final Production Checklist

- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:e2e` passes.
- [ ] All Prisma migrations applied.
- [ ] `ORDER_ROUTER_MODE=live` startup validation passes only in production with secrets.
- [ ] One allowlisted user can create Deposit Wallet.
- [ ] Deposit Wallet has pUSD.
- [ ] Allowance is sufficient.
- [ ] Balance cache is fresh.
- [ ] `/orders/preview` returns CLOB quote and gates ready.
- [ ] `/orders/signing-intent` returns exact payload displayed to user.
- [ ] `/orders/signed` stores signed order.
- [ ] `/orders/submit` posts signed order to Polymarket CLOB V2.
- [ ] Polymarket `orderID` is persisted.
- [ ] Order can be cancelled.
- [ ] Fill reconciliation updates Trades and Positions.
- [ ] Builder code appears on submitted order/trade.
- [ ] Admin kill switch works.
- [ ] Production runbook is present.
