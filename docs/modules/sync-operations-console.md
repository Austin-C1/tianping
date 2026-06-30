# Sync Operations Console Module

## Module Name

`sync-operations-console`

## Goal

Give Admin operators a dedicated operations console for queue-backed sync runs. The first scope is visibility and control for market sync jobs created by `queue-sync-readiness`.

## Safety Boundary

This module does not implement real CLOB submit, live order routing, live order status sync, live trade sync, live position sync, cancellation, or user fund movement.

The console reads `SyncJobRun` records and can enqueue the existing market sync job only. It does not add new queue processors or call live CLOB endpoints.

## Dependencies

| Dependency | Use |
|---|---|
| `queue-sync-readiness` | Provides `SyncJobRun`, `/admin/sync/jobs`, and `/admin/sync/market`. |
| `audit-log` | Existing sync audit events remain the source of audit history. |
| `risk-gates` | Console can show queue readiness context through existing Admin gate data. |
| Admin app | Adds the `/operations` route and sidebar entry. |
| `@pmx/api-client` | Admin UI must use typed API-client methods. |

## User Experience

| Area | Behavior |
|---|---|
| Route | Admin `/operations`. |
| Summary | Shows active job count, latest job status, latest failure, and live-submit safety state. |
| Job table | Lists recent sync jobs with type, status, queue job id, timestamps, failure reason, and result metadata. |
| Action | Admin can enqueue the existing market sync job from the console. |
| Safety copy | The page states that it records background sync status only and does not enable real CLOB submit. |

## API Usage

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/sync/jobs` | List recent sync job runs. |
| `GET` | `/admin/sync/jobs/:id` | Read one sync job run if a detail action is added later. |
| `POST` | `/admin/sync/market` | Enqueue the existing market sync job. |

No new API endpoint is required in the first implementation.

## Acceptance Criteria

| Area | Standard |
|---|---|
| Navigation | Admin sidebar includes an operations entry and `/operations` renders a dedicated console. |
| Permission | Page remains behind the existing Admin route guard; sync APIs remain Admin-only. |
| Data | Console loads recent `SyncJobRun` records through `@pmx/api-client`. |
| Display | Table shows type, status, queue job id, created/start/completion timestamps, failure reason, and result metadata. |
| Action | Market sync button calls `POST /admin/sync/market`, then refreshes the job list. |
| Empty state | If no jobs exist, the console shows a useful empty state. |
| Errors | API errors appear in an alert without hiding existing page chrome. |
| Safety | Visible copy says the module does not enable real CLOB submit, submit orders, or move user funds. |
| Scope | No new Prisma model, queue processor, live CLOB client call, or order submit behavior is added. |
| Documentation | Module document, module index, and project memory are updated. |
| Verification | Admin test, Admin build, e2e Admin flow, and full project checks pass. |

## Verification Commands

```bash
npm run prisma:generate
npm run test --workspace @pmx/admin
npm run build --workspace @pmx/admin
npm run test:e2e -- tests/e2e/admin.spec.ts
npm test
npm run build
npm run lint
npm run test:e2e
```

## Current State

Implemented on branch `codex/sync-operations-console`.

Implemented files include:

- `apps/admin/src/api/admin.ts`
- `apps/admin/src/api/admin.test.ts`
- `apps/admin/src/views/OperationsView.vue`
- `apps/admin/src/router/index.ts`
- `apps/admin/src/layouts/AdminLayout.vue`
- `apps/admin/src/styles/app.css`
- `tests/e2e/admin.spec.ts`

Targeted verification passed on 2026-07-01:

```bash
npm run test --workspace @pmx/admin
npm run build --workspace @pmx/admin
npm run test:e2e -- tests/e2e/admin.spec.ts --grep "operations console"
```
