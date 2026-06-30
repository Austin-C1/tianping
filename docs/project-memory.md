# PMX Project Memory

## Project Goal

PMX is a non-custodial Polymarket trading workspace. The current product direction is a verifiable trading-preparation chain: auth, market browsing, wallet proof, Deposit Wallet readiness, funding readiness, order preview, signed payload capture, paper submit, then guarded live CLOB only after manual approval.

## Current Baseline

- Web, Admin, API, PostgreSQL, and Redis run locally.
- `npm test`, `npm run build`, `npm run lint`, and `npm run test:e2e` passed after `manual-live-approval` implementation on 2026-06-30.
- Real CLOB submit remains disabled by default.
- Current useful local URLs:
  - Web: `http://127.0.0.1:3000`
  - Admin: `http://127.0.0.1:3001/#/login`
  - API health: `http://127.0.0.1:4000/health`
- Default admin:
  - Email: `admin@pmx.local`
  - Password: `change-me-123`

## Development Rules

- Develop one module at a time.
- Each module keeps its own memory document under `docs/modules/`.
- Cross-module status is summarized in `docs/module-index.md`.
- Module memory records stable facts, boundaries, interfaces, verification commands, and current state.
- Do not mix temporary chat notes into project memory.
- Do not enable real CLOB submit without explicit manual confirmation.
- Do not store user private keys, mnemonics, or signing secrets.

## Active Module

Current module: `manual-live-approval`

Recent completed module: `wallet-funding-readiness`

Goal: move from order preview only to a safe paper order lifecycle:

```text
PREVIEWED -> SIGNING_REQUESTED -> SIGNED -> SUBMITTED
```

The first implementation must stay in `ORDER_ROUTER_MODE=paper` for submit. `preview` mode must block submit. Live mode is out of scope for this module.

Implemented on 2026-06-30:

- API added signing intent, signed payload persistence, paper submit, order list, and order detail endpoints.
- Web market detail can take a previewed order through simulated paper signing and paper submit.
- Admin Orders route is now a read-only order visibility table.
- Paper provider returns local `paper_<orderId>` IDs and does not call Polymarket.
- Full verification passed after implementation on 2026-06-30.

Active goal: submitted paper orders create paper trades and paper positions, then the Web Portfolio page shows them.

Implemented on 2026-06-30:

- Paper submit now writes one `Trade` row and upserts one `Position` row.
- API added authenticated `GET /portfolio`.
- Web Portfolio page loads and displays paper positions and recent paper trades.
- Full verification passed after implementation on 2026-06-30.

Active goal: key auth, order, and portfolio actions write safe audit records, and Admin can inspect them through a read-only `/audit` page.

Implemented on 2026-06-30:

- API added `AuditLogService` in `ComplianceModule`.
- Auth register/login, order preview/signing/signed/submit, and portfolio reads now write `AuditLog` rows.
- Audit metadata removes private-key, mnemonic, seed, and secret-style fields before persistence.
- Admin API added `GET /admin/audit`, restricted to Admin users.
- Admin `/audit` now shows action, user email/user id, metadata summary, and timestamp in a read-only table.
- Full verification passed after implementation on 2026-06-30.

Active goal: expose real-trading blockers in Admin without enabling real CLOB submit.

Implemented on 2026-06-30:

- API added Admin-only `GET /admin/risk/gates`.
- Risk gate report aggregates Order Router mode, market sync, quote sync, wallet binding, Deposit Wallet readiness, audit trail, rate-limit events, and manual live approval.
- `canSubmitLiveOrders` remains false because manual live approval is intentionally blocked in this module.
- Admin `/risk` now shows live-order status, blocking count, warning count, router mode, and a read-only gate table.
- Full verification passed after implementation on 2026-06-30.

Active goal: include cached Deposit Wallet pUSD balance and CLOB exchange allowance in Admin risk readiness.

Implemented on 2026-06-30:

- Admin risk report now includes a blocking `funding-readiness` gate.
- Funding readiness is based on existing `DepositWallet` cache fields: `pUsdBalance`, `exchangeAllowance`, and `balanceAllowanceUpdatedAt`.
- Fresh positive pUSD and allowance mark the gate `READY`; missing/stale/zero values mark it `PENDING`.
- Admin `/risk` displays the gate as `资金与授权准备状态`.
- The module does not call chain providers, auto-refresh balances, add mutation endpoints, or enable real CLOB submit.
- Full verification passed after implementation on 2026-06-30.

Active goal: Admin-only manual live approval and revoke records for real-trading readiness.

Implemented on 2026-06-30:

- Prisma added `LiveTradingApproval` with explicit `APPROVED`/`REVOKED` status, reasons, approving/revoking operators, and approval/revoke timestamps.
- API added Admin-only `GET /admin/live-approval`, `POST /admin/live-approval/approve`, and `POST /admin/live-approval/revoke`.
- Approve writes `live_approval.approved`; revoke writes `live_approval.revoked`.
- `GET /admin/risk/gates` now reads the active approval row for `manual-live-approval` instead of returning a fixed blocked gate.
- Admin `/risk` shows approval state, approval/revoke details, reason input, approve/revoke buttons, and explicit copy that this does not enable real CLOB submit.
- Real CLOB submit remains unimplemented and disabled; order submit behavior and user funds were not changed.
- Full verification passed after implementation on 2026-06-30.

## Verified Commands

```bash
docker compose up -d
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm test
npm run build
npm run lint
npm run test:e2e
```

Targeted commands already verified during `orders-paper-loop` implementation:

```bash
npm test --workspace @pmx/api -- orders
npm test --workspace @pmx/web -- src/features/trading/order-preview-client.test.ts
npm test --workspace @pmx/web -- src/features/trading/order-ticket.test.tsx
npm test --workspace @pmx/web -- src/features/markets/market-detail-page.test.tsx
npm run build --workspace @pmx/admin
```

Final verification for the module:

```bash
npm run db:migrate
npm run prisma:generate
npm test
npm run build
npm run lint
npm run test:e2e
```

Targeted commands already verified during `paper-portfolio` implementation:

```bash
npm test --workspace @pmx/api -- orders portfolio
npm test --workspace @pmx/web -- src/features/portfolio/portfolio-client.test.ts src/app/portfolio/page.test.tsx
```

Final verification for `paper-portfolio`:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Targeted commands already verified during `audit-risk` implementation:

```bash
npm test --workspace @pmx/api -- audit-log auth orders portfolio admin
npm run build --workspace @pmx/admin
```

Final verification for `audit-risk`:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Targeted commands already verified during `risk-gates` implementation:

```bash
npm test --workspace @pmx/api -- admin
npm run build --workspace @pmx/admin
npm run test:e2e
```

Final verification for `risk-gates`:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Targeted commands already verified during `wallet-funding-readiness` implementation:

```bash
npm test --workspace @pmx/api -- admin
npm run build --workspace @pmx/admin
npm run test:e2e
```

Targeted commands already verified during `manual-live-approval` implementation:

```bash
npm run db:migrate
npm run prisma:generate
npm test --workspace @pmx/api -- admin
npm run build --workspace @pmx/admin
npm run test:e2e -- tests/e2e/admin.spec.ts
```

Final verification for `manual-live-approval`:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Final verification for `wallet-funding-readiness`:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Local services confirmed responding with HTTP 200:

- API health: `http://127.0.0.1:4000/health`
- Web: `http://127.0.0.1:3000`
- Admin: `http://127.0.0.1:3001`

## Known Worktree State

- `README.md` has existing uncommitted edits.
- `.nx/` contains untracked cache/generated files.
- `docs/superpowers/plans/2026-06-25-pmx-light-market-ui-implementation-plan.md` is untracked from earlier work.
