# Queue Sync Readiness Module

## Module Name

`queue-sync-readiness`

## Goal

Build the first observable queue-based sync layer before any live trading work. The module makes sync jobs visible, retryable, auditable, and safe to operate from Admin.

## Safety Boundary

This module does not implement real CLOB submit, live order routing, live fill reconciliation, cancellation, or user fund movement.

The first implementation target is queued market and quote sync. Order status, trade, and position sync queues remain registered and visible as readiness surfaces, but they do not call live CLOB endpoints in this module.

## Implemented Context

| Area | Current State |
|---|---|
| Queue names | `apps/api/src/jobs/queue-names.ts` defines `market-sync`, `order-status-sync`, `trade-sync`, `position-sync`, and `audit-log`. |
| Queue module | `apps/api/src/jobs/jobs.module.ts` registers queues and wires `SyncJobsService`, `SyncJobsController`, and `MarketSyncProcessor`. |
| Market sync | `POST /admin/sync/market` enqueues market/quote sync; legacy `POST /admin/markets/sync` remains available. |
| Risk gates | Admin risk gates read latest `MarketSnapshot.syncedAt`, `MarketQuoteSnapshot.syncedAt`, and latest `SyncJobRun` for `queue-sync-readiness`. |
| Admin Markets | Admin markets page enqueues a background sync job and displays the queued job status. |

## Architecture

| Layer | Design |
|---|---|
| Database | `SyncJobRun` records queue job status, requester, timestamps, result, and failure reason. |
| Repository | `PrismaSyncJobRunsRepository` creates, lists, updates, and completes/fails sync job runs behind `SYNC_JOB_RUNS_REPOSITORY`. |
| Queue service | `SyncJobsService` exposes Admin-only enqueue/list/status behavior and duplicate-active-job protection. |
| Processor | `MarketSyncProcessor` runs existing `MarketsService.syncActiveMarkets()` using an internal Admin operator. |
| Audit | Enqueue, completion, and failure write audit events. |
| Admin UI | Admin Markets page uses the queued endpoint and displays the queued job status. |
| Risk gates | `queue-sync-readiness` gate is based on the latest market sync job run. Existing market/quote freshness gates still use snapshot timestamps. |

## Data Model

`SyncJobRun` in `apps/api/prisma/schema.prisma`:

| Field | Purpose |
|---|---|
| `id` | Local job run id. |
| `type` | Job type, for example `MARKET_SYNC`. |
| `queueJobId` | BullMQ job id after enqueue. |
| `status` | `QUEUED`, `RUNNING`, `SUCCEEDED`, or `FAILED`. |
| `requestedById` | Admin user who enqueued the job, nullable for system jobs. |
| `startedAt` | Processor start time. |
| `completedAt` | Processor success/failure time. |
| `result` | Structured result, for example market and quote sync counts. |
| `failureReason` | Failure message. |
| `metadata` | Enqueue metadata, including the safety notice. |
| `createdAt` / `updatedAt` | Operational timestamps. |

Use string fields for `type` and `status` to match existing project style for approval, operation, and relayer statuses.

The database also has a partial unique index on active jobs: one `SyncJobRun.type` can have only one `QUEUED` or `RUNNING` row at a time. This protects duplicate enqueue behavior under concurrent Admin requests.

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/admin/sync/market` | Enqueue a market sync job and return the active `SyncJobRun`. |
| `GET` | `/admin/sync/jobs` | List latest sync job runs. |
| `GET` | `/admin/sync/jobs/:id` | Read one sync job run. |

Compatibility rule: keep `POST /admin/markets/sync` available during this module. It can remain synchronous until Admin UI and API client switch to the queued endpoint.

## Status Rules

| From | To | Trigger |
|---|---|---|
| none | `QUEUED` | Admin enqueues a market sync job. |
| `QUEUED` | `RUNNING` | Processor starts the BullMQ job. |
| `RUNNING` | `SUCCEEDED` | `MarketsService.syncActiveMarkets()` returns a result. |
| `QUEUED` or `RUNNING` | `FAILED` | Processor catches an error or cannot load the run record. |

Duplicate protection: if a `MARKET_SYNC` run is already `QUEUED` or `RUNNING`, `POST /admin/sync/market` returns the existing active run and does not enqueue another BullMQ job.

Terminal protection: `SUCCEEDED` and `FAILED` runs are not moved back to `RUNNING` if BullMQ redelivers an already-completed job.

## Audit Actions

| Action | When |
|---|---|
| `sync.market.enqueued` | Admin enqueues a market sync job. |
| `sync.market.completed` | Market sync job finishes successfully. |
| `sync.market.failed` | Market sync job fails, including enqueue failure after a run record is created. |

Audit metadata includes `syncJobRunId`, `type`, queue job id or result/failure fields where applicable. It must not include secrets or private keys.

## Acceptance Criteria

| Area | Standard |
|---|---|
| Permission | Non-Admin calls to `POST /admin/sync/market`, `GET /admin/sync/jobs`, and `GET /admin/sync/jobs/:id` return `403`. |
| Enqueue | Admin enqueue creates a `SyncJobRun` with `type=MARKET_SYNC`, `status=QUEUED`, `queueJobId`, and `requestedById`. |
| Duplicate control | If a market sync job is `QUEUED` or `RUNNING`, a second enqueue returns the active run and does not create a duplicate BullMQ job. |
| Processor success | Processor transitions `QUEUED -> RUNNING -> SUCCEEDED`, calls existing market sync logic once, and stores structured sync counts in `result`. |
| Processor failure | Processor transitions to `FAILED`, stores an error message, and does not crash the API process. |
| Audit | Enqueue writes `sync.market.enqueued`; success writes `sync.market.completed`; failure writes `sync.market.failed`. |
| Admin UI | Admin Markets page can enqueue market sync, show queued state and last failure reason, and refresh without blocking the page. |
| Risk gates | Admin risk gates include a queue readiness gate. Market and quote freshness gates continue to use snapshot `syncedAt` values. |
| Safety | No real CLOB submit, live order status sync, live trade sync, live position sync, cancellation, or fund movement is added. |
| Compatibility | Existing market listing and order preview flows continue to read `MarketSnapshot` and `MarketQuoteSnapshot` as before. |
| Verification | API tests, Admin build, API client tests, e2e Admin test, `npm test`, `npm run build`, `npm run lint`, and `npm run test:e2e` pass. |

## Required Verification Commands

```bash
npm run db:migrate
npm run prisma:generate
npm test --workspace @pmx/api -- jobs admin markets
npm run generate --workspace @pmx/api-client
npm run test --workspace @pmx/api-client
npm run build --workspace @pmx/admin
npm run test:e2e -- tests/e2e/admin.spec.ts
npm test
npm run build
npm run lint
npm run test:e2e
```

Post-review hardening completed:

- Added `SyncJobRun_type_active_unique_idx` to prevent concurrent duplicate active jobs.
- Enforced status transitions with conditional updates.
- Made repeated delivery of terminal jobs return the existing record without rerunning market sync.
- Added audit logging for enqueue failure.
- Added `queue-sync-readiness` to both `/admin/risk/gates` and `/admin/gates`.

## Current State

Implemented on branch `codex/queue-sync-readiness`.

Implemented files include:

- `apps/api/prisma/migrations/20260630231500_add_sync_job_runs/migration.sql`
- `apps/api/src/infrastructure/repositories/prisma-sync-job-runs.repository.ts`
- `apps/api/src/jobs/sync-jobs.service.ts`
- `apps/api/src/jobs/sync-jobs.controller.ts`
- `apps/api/src/jobs/market-sync.processor.ts`
- `libs/api-client/src/index.ts`
- `apps/admin/src/api/admin.ts`
- `apps/admin/src/views/PlaceholderView.vue`
- `apps/admin/src/views/RiskView.vue`
- `tests/e2e/admin.spec.ts`

Targeted verification already passed:

```bash
npm run prisma:generate
npm run test --workspace @pmx/api -- --runTestsByPath src/infrastructure/repositories/prisma-sync-job-runs.repository.spec.ts src/infrastructure/repositories/repositories.module.spec.ts src/jobs/sync-jobs.service.spec.ts src/jobs/sync-jobs.controller.spec.ts src/jobs/market-sync.processor.spec.ts src/admin/admin.service.spec.ts src/openapi/openapi-document.spec.ts
npm run generate --workspace @pmx/api-client
npm run test --workspace @pmx/api-client
npm run test --workspace @pmx/admin
```

Full verification passed after implementation:

```bash
npm run db:migrate
npm run db:seed
npm test
npm run build
npm run lint
npm run test:e2e
```
