# PMX Project Memory

## Project Goal

PMX is a non-custodial Polymarket trading workspace. The current product direction is a verifiable trading-preparation chain: auth, market browsing, wallet proof, Deposit Wallet readiness, funding readiness, order preview, signed payload capture, paper submit, then guarded live CLOB only after explicit future approval and implementation.

Real CLOB submit is still not implemented and must stay disabled.

## Current Baseline

- Web, Admin, API, PostgreSQL, and Redis run locally.
- Useful local URLs:
  - Web: `http://127.0.0.1:3000`
  - Admin: `http://127.0.0.1:3001/#/login`
  - API health: `http://127.0.0.1:4000/health`
- Default local admin:
  - Email: `admin@pmx.local`
  - Password: `change-me-123`
- `origin/main` now includes:
  - Nx workspace targets and project metadata.
  - `libs/contracts` for shared contracts, with `@pmx/shared` kept as compatibility forwarding.
  - `libs/domain` for pure order-domain logic.
  - `libs/api-client` for generated/typed HTTP access.
  - API repository boundaries under `apps/api/src/infrastructure/repositories`.
  - Web actions and flow boundaries under `apps/web/src/flows` and feature `*-actions.ts`.
- The 2026-06-30 conflict resolution keeps those `origin/main` boundaries and integrates the paper order loop, audit/risk, funding gate, and manual live approval work into them.

## Development Rules

- Develop one module at a time.
- Each module keeps its own memory document under `docs/modules/`.
- Cross-module status is summarized in `docs/module-index.md`.
- Module memory records stable facts, boundaries, interfaces, verification commands, and current state.
- Do not mix temporary chat notes into project memory.
- Do not enable real CLOB submit without explicit future module scope and user confirmation.
- Do not store user private keys, mnemonics, signing secrets, or raw secret-like payload keys.

## Active Module State

Current completed module: `queue-sync-readiness`.

Recent completed modules:

- `orders-paper-loop`
- `paper-portfolio`
- `audit-log`
- `risk-gates`
- `wallet-funding-readiness`
- `manual-live-approval`
- `queue-sync-readiness`
- `api-client`
- `api-repositories`
- `v2-web-business-flow-layer`
- `contracts`
- `domain`
- `nx-workspace`

## Stable Implementation Facts

- Orders preview creates a CLOB V2 draft and persists a `PREVIEWED` order. Submit remains disabled in preview output.
- Paper order lifecycle is:

```text
PREVIEWED -> SIGNING_REQUESTED -> SIGNED -> SUBMITTED
```

- `ORDER_ROUTER_MODE=preview` blocks submit.
- `ORDER_ROUTER_MODE=paper` can call the local paper provider and creates local paper order IDs.
- `ORDER_ROUTER_MODE=live` still rejects submit because live CLOB submit is not implemented in this module.
- Paper submit writes a `Trade` row and upserts a `Position` row.
- Portfolio reads only existing paper trade/position data.
- Auth register/login, order preview/signing/signed/submit, portfolio reads, and live approval mutations write audit records.
- Audit metadata removes private-key, mnemonic, seed, and secret-style fields before persistence.
- Admin audit is read-only.
- Admin risk gates aggregate Order Router mode, market sync, quote sync, wallet binding, Deposit Wallet readiness, funding readiness, audit trail, rate-limit events, and manual live approval.
- Funding readiness uses existing cached `DepositWallet` fields: `pUsdBalance`, `exchangeAllowance`, and `balanceAllowanceUpdatedAt`.
- Manual live approval stores Admin approval/revoke state, reasons, operators, and timestamps in `LiveTradingApproval`.
- Manual live approval writes `live_approval.approved` and `live_approval.revoked` audit actions.
- Manual live approval changes the `manual-live-approval` risk gate only. It does not enable real CLOB submit, change order submit behavior, or move user funds.
- Queue sync readiness stores Admin-triggered sync runs in `SyncJobRun`.
- `POST /admin/sync/market` enqueues a `MARKET_SYNC` job and returns the active `SyncJobRun`; duplicate active `QUEUED` or `RUNNING` jobs are not re-enqueued.
- `SyncJobRun_type_active_unique_idx` enforces one active `QUEUED` or `RUNNING` job per sync type at the database level.
- `SyncJobRun` state transitions are conditional: `QUEUED -> RUNNING`, then `RUNNING -> SUCCEEDED` or `QUEUED/RUNNING -> FAILED`. Terminal jobs are not reprocessed on repeated queue delivery.
- `GET /admin/sync/jobs` and `GET /admin/sync/jobs/:id` expose Admin-only sync job status.
- `MarketSyncProcessor` reuses existing `MarketsService.syncActiveMarkets()` for queued market and quote snapshots.
- Queue sync writes `sync.market.enqueued`, `sync.market.completed`, and `sync.market.failed` audit actions.
- Admin risk gates include `queue-sync-readiness`, based on the latest `MARKET_SYNC` `SyncJobRun`.
- Admin operational gates (`/admin/gates`) also include `queue-sync-readiness`, so the Admin Markets page does not fall back to stale pending state.
- Queue sync readiness does not implement real CLOB submit, live order status sync, live trade sync, live position sync, cancellation, or user fund movement.
- Web/Admin low-level API access should go through `@pmx/api-client`.
- Web UI components should call actions/flows rather than feature `*-client` modules directly.
- API services should prefer repository interfaces under `apps/api/src/infrastructure/repositories` instead of direct Prisma access when a repository contract exists.

## Verified Commands

Common local setup and verification commands:

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

Post-review hardening for queue sync readiness passed the same full verification after adding the active-job unique index, conditional state transitions, enqueue failure audit, and `/admin/gates` queue status.

Useful targeted verification:

```bash
npm test --workspace @pmx/api -- auth
npm test --workspace @pmx/api -- orders
npm test --workspace @pmx/api -- admin
npm test --workspace @pmx/api -- openapi-document.spec.ts
npm test --workspace @pmx/web -- order
npm run test:flow --workspace @pmx/web -- ui-client-boundary.test.ts
npm run test --workspace @pmx/admin -- api-client-boundary.test.ts
npm run build --workspace @pmx/admin
npm run test --workspace @pmx/api-client
```

Queue sync readiness targeted verification on 2026-06-30 passed:

```bash
npm run prisma:generate
npm run generate --workspace @pmx/api-client
npm run test --workspace @pmx/api -- --runTestsByPath src/infrastructure/repositories/prisma-sync-job-runs.repository.spec.ts src/infrastructure/repositories/repositories.module.spec.ts src/jobs/sync-jobs.service.spec.ts src/jobs/sync-jobs.controller.spec.ts src/jobs/market-sync.processor.spec.ts src/admin/admin.service.spec.ts src/openapi/openapi-document.spec.ts
npm run test --workspace @pmx/api-client
npm run test --workspace @pmx/admin
```

Queue sync readiness full verification on 2026-06-30 passed:

```bash
npm run db:migrate
npm run db:seed
npm test
npm run build
npm run lint
npm run test:e2e
```

Before the PR conflict resolution on 2026-06-30, the manual live approval implementation passed:

```bash
npm run db:migrate
npm run prisma:generate
npm test
npm run build
npm run lint
npm run test:e2e
```

After merging `origin/main` into the feature branch on 2026-06-30, conflict resolution verification passed:

```bash
npm run generate --workspace @pmx/api-client
npm test
npm run build
npm run lint
npm run test:e2e
```

## Dependency Audit Notes

On 2026-06-30, `npm audit fix` safely updated lockfile-only dependency versions for `@nestjs/swagger`, nested `js-yaml`, `swagger-ui-dist`, and `viem`.

`npm audit` still reports upstream dependency-chain risks after the safe fix. The main remaining sources are Polymarket SDK chains (`axios`, `ethers@5`, `viem`, `ws`), Nest `multer`, Next `postcss`, and Vite `esbuild`. Do not run `npm audit fix --force` without a dedicated dependency-upgrade module because npm proposes breaking downgrades such as Nest `7.5.5` and Next `9.3.3`, and Polymarket SDK replacement needs contract review.

## Planned Next Module

Next planned module is not selected yet. Do not start live CLOB submit, live order status sync, live trade sync, live position sync, cancellation, or user fund movement without a separate approved module document.
