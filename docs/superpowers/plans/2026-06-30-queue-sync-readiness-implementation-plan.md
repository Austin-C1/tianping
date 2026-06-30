# Queue Sync Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add an observable Admin-controlled queue sync readiness layer, starting with queued market and quote sync.

**Architecture:** Persist every sync run in `SyncJobRun`, enqueue market sync through BullMQ, process it with the existing `MarketsService.syncActiveMarkets()` logic, and expose status to Admin. Keep existing market snapshots as the source of truth for Web trading and risk freshness gates.

**Tech Stack:** NestJS, BullMQ, Prisma, PostgreSQL, Vue 3, Ant Design Vue, `@pmx/api-client`, Jest, Vitest, Playwright.

**Implementation Result:** Implemented on branch `codex/queue-sync-readiness`. The final code uses `apps/api/src/jobs/sync-jobs.service.ts` / `sync-jobs.service.spec.ts`, migration `20260630231500_add_sync_job_runs`, and actual `SyncJobRun` fields `queueJobId`, `completedAt`, and `failureReason` instead of the early-plan names `bullJobId`, `finishedAt`, and `error`.

**Final Verification:** `npm run db:migrate`, `npm run db:seed`, `npm test`, `npm run build`, `npm run lint`, and `npm run test:e2e` passed on 2026-06-30.

**Post-Review Hardening:** Added a partial unique active-job index, conditional state transitions, terminal-job redelivery protection, enqueue failure audit, and `/admin/gates` queue status. Full verification passed again after these changes.

---

## Starting Context

Read these files before implementation:

- `docs/project-memory.md`
- `docs/module-index.md`
- `docs/modules/queue-sync-readiness.md`
- `docs/modules/risk-gates.md`
- `apps/api/src/jobs/queue-names.ts`
- `apps/api/src/jobs/jobs.module.ts`
- `apps/api/src/markets/markets.service.ts`
- `apps/api/src/markets/markets.controller.ts`
- `apps/api/src/admin/admin.service.ts`
- `apps/admin/src/views/PlaceholderView.vue`
- `libs/api-client/src/index.ts`

Run before editing:

```bash
git status -sb
```

Expected: either clean, or only intentional documentation files from this planning step.

## File Structure

Create these files:

- `apps/api/prisma/migrations/20260630_queue_sync_readiness/migration.sql`
  - Adds `SyncJobRun` table and indexes.
- `apps/api/src/jobs/sync-job.types.ts`
  - Defines queue sync status/type constants and TypeScript types.
- `apps/api/src/jobs/sync-job-runs.service.ts`
  - Enqueues jobs, protects against duplicate active runs, and reads job status.
- `apps/api/src/jobs/sync-job-runs.service.spec.ts`
  - Unit tests for enqueue/list/status behavior.
- `apps/api/src/jobs/market-sync.processor.ts`
  - BullMQ worker for `market-sync`.
- `apps/api/src/jobs/market-sync.processor.spec.ts`
  - Unit tests for processor success/failure transitions.
- `apps/api/src/infrastructure/repositories/prisma-sync-job-runs.repository.ts`
  - Prisma-backed `SyncJobRun` persistence.
- `apps/api/src/jobs/sync-jobs.controller.ts`
  - Admin-only sync job API.
- `apps/api/src/jobs/sync-jobs.controller.spec.ts`
  - Controller route/auth tests.

Modify these files:

- `apps/api/prisma/schema.prisma`
  - Add `SyncJobRun` model and `User.syncJobRuns`.
- `apps/api/src/infrastructure/repositories/repository.types.ts`
  - Add repository token, input types, and interface.
- `apps/api/src/infrastructure/repositories/repositories.module.ts`
  - Bind `SYNC_JOB_RUNS_REPOSITORY`.
- `apps/api/src/jobs/jobs.module.ts`
  - Import required modules, register controller/service/processor, export service.
- `apps/api/src/markets/markets.module.ts`
  - Export `MarketsService` so the processor can reuse existing sync logic.
- `apps/api/src/openapi/api-contract.dto.ts`
  - Add `SyncJobRunDto` and related response DTOs.
- `apps/api/src/admin/admin.service.ts`
  - Add queue readiness gate to risk gate report.
- `apps/api/src/admin/admin.service.spec.ts`
  - Cover queue readiness gate states.
- `libs/api-client/src/index.ts`
  - Add sync job types and Admin sync methods.
- `libs/api-client/src/index.test.ts`
  - Verify API client paths and auth behavior.
- `apps/admin/src/api/admin.ts`
  - Export queued sync functions and types.
- `apps/admin/src/views/PlaceholderView.vue`
  - Change Markets page sync action to enqueue and poll job status.
- `tests/e2e/admin.spec.ts`
  - Update Admin Markets operation test to mock queued sync flow.
- `docs/project-memory.md`
  - Record stable queue-sync facts after implementation.
- `docs/module-index.md`
  - Mark Queue Sync as implemented/readiness.
- `docs/modules/queue-sync-readiness.md`
  - Update current state and verification.

## Shared Type Contract

Use these values consistently:

```ts
export const SYNC_JOB_TYPES = {
  marketSync: "MARKET_SYNC",
  orderStatusSync: "ORDER_STATUS_SYNC",
  tradeSync: "TRADE_SYNC",
  positionSync: "POSITION_SYNC"
} as const;

export const SYNC_JOB_STATUSES = {
  queued: "QUEUED",
  running: "RUNNING",
  succeeded: "SUCCEEDED",
  failed: "FAILED"
} as const;

export type SyncJobType = (typeof SYNC_JOB_TYPES)[keyof typeof SYNC_JOB_TYPES];
export type SyncJobStatus = (typeof SYNC_JOB_STATUSES)[keyof typeof SYNC_JOB_STATUSES];
```

## Task 1: Add Sync Job Persistence

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260630_queue_sync_readiness/migration.sql`
- Modify: `apps/api/src/infrastructure/repositories/repository.types.ts`
- Create: `apps/api/src/infrastructure/repositories/prisma-sync-job-runs.repository.ts`
- Modify: `apps/api/src/infrastructure/repositories/repositories.module.ts`
- Test: `apps/api/src/infrastructure/repositories/repositories.module.spec.ts`

- [x] **Step 1: Write repository binding test**

Add the sync job repository token to the existing binding assertion in `apps/api/src/infrastructure/repositories/repositories.module.spec.ts`.

Expected repository token:

```ts
SYNC_JOB_RUNS_REPOSITORY
```

- [x] **Step 2: Run repository test and verify failure**

```bash
npm test --workspace @pmx/api -- repositories.module.spec.ts
```

Expected: FAIL because `SYNC_JOB_RUNS_REPOSITORY` is not exported yet.

- [x] **Step 3: Add Prisma schema model**

Add to `User`:

```prisma
syncJobRuns SyncJobRun[]
```

Add model:

```prisma
model SyncJobRun {
  id            String    @id @default(cuid())
  type          String
  queueName     String
  bullJobId     String?
  status        String
  requestedById String?
  startedAt     DateTime?
  finishedAt    DateTime?
  result        Json?
  error         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  requestedBy   User?     @relation(fields: [requestedById], references: [id], onDelete: SetNull)

  @@index([type, status, createdAt])
  @@index([queueName, bullJobId])
  @@index([requestedById, createdAt])
}
```

- [x] **Step 4: Create migration SQL**

Create `apps/api/prisma/migrations/20260630_queue_sync_readiness/migration.sql`:

```sql
CREATE TABLE "SyncJobRun" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "bullJobId" TEXT,
    "status" TEXT NOT NULL,
    "requestedById" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJobRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncJobRun_type_status_createdAt_idx" ON "SyncJobRun"("type", "status", "createdAt");
CREATE INDEX "SyncJobRun_queueName_bullJobId_idx" ON "SyncJobRun"("queueName", "bullJobId");
CREATE INDEX "SyncJobRun_requestedById_createdAt_idx" ON "SyncJobRun"("requestedById", "createdAt");

ALTER TABLE "SyncJobRun"
ADD CONSTRAINT "SyncJobRun_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [x] **Step 5: Add repository types**

Add to `apps/api/src/infrastructure/repositories/repository.types.ts`:

```ts
export const SYNC_JOB_RUNS_REPOSITORY = Symbol("SYNC_JOB_RUNS_REPOSITORY");

export interface CreateSyncJobRunInput {
  type: string;
  queueName: string;
  requestedById?: string | null;
}

export interface SyncJobRunRecord {
  id: string;
  type: string;
  queueName: string;
  bullJobId: string | null;
  status: string;
  requestedById: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  result: unknown | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncJobRunsRepository {
  createQueued(input: CreateSyncJobRunInput): Promise<SyncJobRunRecord>;
  findActiveByType(type: string): Promise<SyncJobRunRecord | null>;
  findById(id: string): Promise<SyncJobRunRecord | null>;
  listLatest(limit: number): Promise<SyncJobRunRecord[]>;
  attachBullJobId(id: string, bullJobId: string): Promise<SyncJobRunRecord>;
  markRunning(id: string, startedAt: Date): Promise<SyncJobRunRecord>;
  markSucceeded(id: string, finishedAt: Date, result: unknown): Promise<SyncJobRunRecord>;
  markFailed(id: string, finishedAt: Date, error: string): Promise<SyncJobRunRecord>;
}
```

- [x] **Step 6: Implement Prisma repository**

Create `apps/api/src/infrastructure/repositories/prisma-sync-job-runs.repository.ts` with methods backed by `prisma.syncJobRun`.

Active statuses must be:

```ts
["QUEUED", "RUNNING"]
```

- [x] **Step 7: Bind repository provider**

Add `PrismaSyncJobRunsRepository` to `apps/api/src/infrastructure/repositories/repositories.module.ts` and bind it to `SYNC_JOB_RUNS_REPOSITORY`.

- [x] **Step 8: Run repository verification**

```bash
npm run prisma:generate
npm test --workspace @pmx/api -- repositories.module.spec.ts
```

Expected: PASS.

## Task 2: Add Sync Job Service And Admin API

**Files:**

- Create: `apps/api/src/jobs/sync-job.types.ts`
- Create: `apps/api/src/jobs/sync-job-runs.service.ts`
- Create: `apps/api/src/jobs/sync-job-runs.service.spec.ts`
- Create: `apps/api/src/jobs/sync-jobs.controller.ts`
- Create: `apps/api/src/jobs/sync-jobs.controller.spec.ts`
- Modify: `apps/api/src/jobs/jobs.module.ts`
- Modify: `apps/api/src/openapi/api-contract.dto.ts`

- [x] **Step 1: Write service tests**

Create tests that prove:

1. Admin enqueue creates a queued market sync run and calls `queue.add`.
2. A second enqueue returns an existing active run and does not call `queue.add`.
3. Non-admin enqueue throws `ForbiddenException`.
4. List and status reject non-admin operators.

Use this operator shape:

```ts
const admin = { id: "admin-1", role: "ADMIN" as const };
const user = { id: "user-1", role: "USER" as const };
```

- [x] **Step 2: Run service tests and verify failure**

```bash
npm test --workspace @pmx/api -- sync-job-runs.service.spec.ts
```

Expected: FAIL because the service does not exist.

- [x] **Step 3: Add sync job constants**

Create `apps/api/src/jobs/sync-job.types.ts` using the Shared Type Contract from this plan.

- [x] **Step 4: Implement service**

`SyncJobRunsService.enqueueMarketSync(operator)` must:

1. Require `operator.role === "ADMIN"`.
2. Call `repository.findActiveByType("MARKET_SYNC")`.
3. Return existing active run when present.
4. Create queued run with `queueName=QUEUE_NAMES.marketSync`.
5. Add BullMQ job with job name `market-sync.run` and payload `{ syncJobRunId }`.
6. Store `bullJobId` on the run.
7. Write `sync.market.enqueued` audit log with `syncJobRunId`, `queueName`, `status`, and `bullJobId`.

- [x] **Step 5: Write controller tests**

Controller tests must prove these routes call the service:

```text
POST /admin/sync/market
GET /admin/sync/jobs
GET /admin/sync/jobs/:id
```

- [x] **Step 6: Add controller**

Create `SyncJobsController` with `@UseGuards(AuthGuard)` and `@ApiBearerAuth("bearer")`.

- [x] **Step 7: Add DTOs**

Add `SyncJobRunDto` to `apps/api/src/openapi/api-contract.dto.ts` with:

```ts
id: string;
type: string;
queueName: string;
bullJobId: string | null;
status: string;
requestedById: string | null;
startedAt: Date | null;
finishedAt: Date | null;
result: unknown | null;
error: string | null;
createdAt: Date;
updatedAt: Date;
```

- [x] **Step 8: Wire module**

Update `JobsModule` to import `AuthModule`, `RepositoriesModule`, and `ComplianceModule`, then provide and export `SyncJobRunsService`.

- [x] **Step 9: Run API tests**

```bash
npm test --workspace @pmx/api -- sync-job-runs.service.spec.ts sync-jobs.controller.spec.ts
```

Expected: PASS.

## Task 3: Add Market Sync Processor

**Files:**

- Create: `apps/api/src/jobs/market-sync.processor.ts`
- Create: `apps/api/src/jobs/market-sync.processor.spec.ts`
- Modify: `apps/api/src/jobs/jobs.module.ts`
- Modify: `apps/api/src/markets/markets.module.ts`

- [x] **Step 1: Write processor tests**

Processor tests must prove:

1. It marks the run `RUNNING` before calling `MarketsService.syncActiveMarkets()`.
2. It marks the run `SUCCEEDED` with the returned sync counts.
3. It writes `sync.market.completed` audit metadata.
4. It marks the run `FAILED` and writes `sync.market.failed` when market sync throws.

- [x] **Step 2: Run processor tests and verify failure**

```bash
npm test --workspace @pmx/api -- market-sync.processor.spec.ts
```

Expected: FAIL because the processor does not exist.

- [x] **Step 3: Export MarketsService**

Update `apps/api/src/markets/markets.module.ts`:

```ts
@Module({
  imports: [AuthModule, MarketProviderModule, PrismaModule],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [MarketsService]
})
export class MarketsModule {}
```

- [x] **Step 4: Implement processor**

Use `@Processor(QUEUE_NAMES.marketSync)` and `WorkerHost`.

The processor must call:

```ts
await this.repository.markRunning(syncJobRunId, new Date());
const result = await this.marketsService.syncActiveMarkets({ role: "ADMIN" });
await this.repository.markSucceeded(syncJobRunId, new Date(), result);
```

On error:

```ts
await this.repository.markFailed(syncJobRunId, new Date(), message);
throw error;
```

Rethrowing keeps BullMQ retry semantics available.

- [x] **Step 5: Wire processor**

Update `JobsModule` to import `MarketsModule` and provide `MarketSyncProcessor`.

- [x] **Step 6: Run processor tests**

```bash
npm test --workspace @pmx/api -- market-sync.processor.spec.ts
```

Expected: PASS.

## Task 4: Add Queue Readiness Risk Gate

**Files:**

- Modify: `apps/api/src/admin/admin.service.ts`
- Modify: `apps/api/src/admin/admin.service.spec.ts`

- [x] **Step 1: Add failing risk gate test**

Add a test proving `getRiskGateReport()` includes a gate:

```ts
{
  key: "queue-sync-readiness",
  title: "Queue sync readiness",
  category: "market",
  status: "READY",
  severity: "INFO",
  blocking: false
}
```

Use a latest succeeded `MARKET_SYNC` `SyncJobRun` record.

- [x] **Step 2: Add stale/failure risk gate tests**

Add cases:

1. No sync job run returns `PENDING` with `WARNING`.
2. Latest market sync job is `FAILED` returns `PENDING` with `WARNING`.
3. Latest market sync job is `QUEUED` or `RUNNING` returns `PENDING` with `INFO`.

- [x] **Step 3: Run tests and verify failure**

```bash
npm test --workspace @pmx/api -- admin.service.spec.ts
```

Expected: FAIL because the gate is not present.

- [x] **Step 4: Implement risk gate**

Inject or query the latest `SyncJobRun` for `MARKET_SYNC`.

Gate evidence examples:

```text
Latest market sync job succeeded at 2026-06-30T10:00:00.000Z.
Latest market sync job failed: Gamma unavailable.
No queued market sync job has been recorded.
Market sync job is RUNNING.
```

- [x] **Step 5: Run admin tests**

```bash
npm test --workspace @pmx/api -- admin.service.spec.ts
```

Expected: PASS.

## Task 5: Update API Client And Admin UI

**Files:**

- Modify: `libs/api-client/src/index.ts`
- Modify: `libs/api-client/src/index.test.ts`
- Modify: `apps/admin/src/api/admin.ts`
- Modify: `apps/admin/src/views/PlaceholderView.vue`

- [x] **Step 1: Add API client tests**

Tests must prove:

```ts
client.admin.enqueueMarketSync()
```

uses:

```text
POST /admin/sync/market
```

and:

```ts
client.admin.listSyncJobs()
client.admin.getSyncJob("job-1")
```

use authenticated GET requests.

- [x] **Step 2: Run API client tests and verify failure**

```bash
npm run test --workspace @pmx/api-client
```

Expected: FAIL because methods are missing.

- [x] **Step 3: Add API client types and methods**

Add:

```ts
export interface SyncJobRun {
  id: string;
  type: string;
  queueName: string;
  bullJobId: string | null;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  requestedById: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  result: unknown | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Add methods under `admin`:

```ts
enqueueMarketSync: () =>
  request<SyncJobRun, Record<string, never>>("POST", "/admin/sync/market", {}, { authenticated: true }),
listSyncJobs: () =>
  request<SyncJobRun[]>("GET", "/admin/sync/jobs", undefined, { authenticated: true }),
getSyncJob: (id: string) =>
  request<SyncJobRun>("GET", `/admin/sync/jobs/${encodeURIComponent(id)}`, undefined, { authenticated: true })
```

- [x] **Step 4: Add Admin API exports**

Add to `apps/admin/src/api/admin.ts`:

```ts
export function enqueueMarketSync(): Promise<SyncJobRun> {
  return runAdminApiRequest(() => createAdminApiClient().admin.enqueueMarketSync())
}

export function fetchSyncJobs(): Promise<SyncJobRun[]> {
  return runAdminApiRequest(() => createAdminApiClient().admin.listSyncJobs())
}

export function fetchSyncJob(id: string): Promise<SyncJobRun> {
  return runAdminApiRequest(() => createAdminApiClient().admin.getSyncJob(id))
}
```

- [x] **Step 5: Update Admin Markets page**

In `apps/admin/src/views/PlaceholderView.vue`, replace direct `syncMarkets()` click behavior with:

1. `enqueueMarketSync()`
2. Set `syncMessage` to queued/running/succeeded/failed text.
3. Poll `fetchSyncJob(id)` every 1500ms until `SUCCEEDED` or `FAILED`.
4. Call `loadStatus()` after terminal state.

Do not poll forever. Stop after 40 attempts and show:

```text
市场同步仍在队列中，请稍后刷新
```

- [x] **Step 6: Run client and Admin build**

```bash
npm run test --workspace @pmx/api-client
npm run build --workspace @pmx/admin
```

Expected: PASS.

## Task 6: Update E2E Coverage

**Files:**

- Modify: `tests/e2e/admin.spec.ts`

- [x] **Step 1: Update Admin operations mock**

Mock:

```text
POST **/admin/sync/market
GET **/admin/sync/jobs/job-1
```

The first status response should be `RUNNING`; the second should be `SUCCEEDED`.

- [x] **Step 2: Assert UI status**

The test should click the market sync button and assert visible text for queued/running/success state.

- [x] **Step 3: Run targeted e2e**

```bash
npm run test:e2e -- tests/e2e/admin.spec.ts
```

Expected: PASS.

## Task 7: Update Docs And Full Verification

**Files:**

- Modify: `docs/project-memory.md`
- Modify: `docs/module-index.md`
- Modify: `docs/modules/queue-sync-readiness.md`

- [x] **Step 1: Update project memory**

Add stable facts:

- Market sync can be enqueued through Admin.
- `SyncJobRun` records queued/running/succeeded/failed state.
- Market sync processor reuses existing `MarketsService.syncActiveMarkets()`.
- Queue sync readiness does not implement live CLOB submit or live fill reconciliation.

- [x] **Step 2: Update module index**

Change Queue Sync row to:

```markdown
| Queue Sync | `apps/api/src/jobs`, `apps/api/prisma`, Admin Markets operations | Implemented for queued market sync readiness; live order/trade/position sync still out of scope | Market sync can develop alone; live reconciliation must be separate | `npm test --workspace @pmx/api -- jobs admin markets`; `npm run build --workspace @pmx/admin`; `npm run test:e2e -- tests/e2e/admin.spec.ts` |
```

- [x] **Step 3: Update module doc current state**

Set `docs/modules/queue-sync-readiness.md` current state to implemented and record verification commands.

- [x] **Step 4: Run full verification**

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

Expected: all commands exit 0.

## Acceptance Checklist

- [x] Non-Admin calls to sync job endpoints return `403`.
- [x] Admin enqueue creates a `QUEUED` `SyncJobRun`.
- [x] Duplicate active market sync enqueue returns the active run and does not enqueue another BullMQ job.
- [x] Processor marks `RUNNING` before market sync work starts.
- [x] Processor marks `SUCCEEDED` and stores result counts on success.
- [x] Processor marks `FAILED` and stores error on failure.
- [x] Audit actions `sync.market.enqueued`, `sync.market.completed`, and `sync.market.failed` are written.
- [x] Admin Markets page enqueues and polls sync job status.
- [x] Risk gate report includes `queue-sync-readiness`.
- [x] Existing market and quote freshness gates still use `MarketSnapshot.syncedAt` and `MarketQuoteSnapshot.syncedAt`.
- [x] No real CLOB submit, live order status sync, live trade sync, live position sync, cancellation, or fund movement is added.
- [x] Full verification commands pass.

## Out Of Scope

- Real CLOB submit.
- Live order status reconciliation.
- Live trade/fill reconciliation.
- Live position reconciliation.
- Cancellation.
- Production scheduler/cron cadence.
- Automatic recovery of stuck jobs beyond visible `QUEUED`/`RUNNING` status and duplicate protection.

## Execution Notes

Implement this as one module. Keep each task independently testable. Commit after each task when the stated tests pass.
