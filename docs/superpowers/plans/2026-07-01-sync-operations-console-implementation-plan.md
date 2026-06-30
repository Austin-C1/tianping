# Sync Operations Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Admin operations console for queue-backed sync jobs without enabling live CLOB submit.

**Architecture:** Reuse the existing `queue-sync-readiness` backend APIs and `@pmx/api-client`. Add thin Admin API wrappers, a Vue route/view, navigation entry, e2e coverage, and module documentation updates. No new database model, queue processor, or live trading behavior is added.

**Tech Stack:** Vue 3, Ant Design Vue, Vue Router, Vitest, Playwright, NestJS API contracts already exposed through `@pmx/api-client`.

---

## File Map

| File | Responsibility |
|---|---|
| `apps/admin/src/api/admin.ts` | Export Admin API wrapper functions for sync job listing/detail. |
| `apps/admin/src/api/admin.test.ts` | Verify Admin wrapper calls stay behind `@pmx/api-client`. |
| `apps/admin/src/views/OperationsView.vue` | Dedicated operations console UI. |
| `apps/admin/src/router/index.ts` | Register `/operations`. |
| `apps/admin/src/layouts/AdminLayout.vue` | Add sidebar menu entry. |
| `apps/admin/src/styles/app.css` | Add compact table/result styles. |
| `tests/e2e/admin.spec.ts` | Verify Admin can open operations console and enqueue market sync. |
| `docs/modules/sync-operations-console.md` | Module goal, boundaries, APIs, acceptance criteria. |
| `docs/module-index.md` | Add module summary and dependencies. |
| `docs/project-memory.md` | Record stable implementation facts and verification. |

## Task 1: Admin API Wrappers

**Files:**
- Modify: `apps/admin/src/api/admin.ts`
- Create: `apps/admin/src/api/admin.test.ts`

- [ ] **Step 1: Write the failing wrapper test**

Create `apps/admin/src/api/admin.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSyncJob: vi.fn(),
  listSyncJobs: vi.fn(),
  runAdminApiRequest: vi.fn((operation: () => Promise<unknown>) => operation())
}));

vi.mock("./http", () => ({
  createAdminApiClient: () => ({
    admin: {
      getSyncJob: mocks.getSyncJob,
      listSyncJobs: mocks.listSyncJobs
    }
  }),
  runAdminApiRequest: mocks.runAdminApiRequest
}));

describe("admin sync job API wrappers", () => {
  beforeEach(() => {
    mocks.getSyncJob.mockReset();
    mocks.listSyncJobs.mockReset();
    mocks.runAdminApiRequest.mockClear();
  });

  it("loads recent sync jobs through the generated API client", async () => {
    mocks.listSyncJobs.mockResolvedValue([{ id: "sync_run_1" }]);

    const { fetchSyncJobs } = await import("./admin");

    await expect(fetchSyncJobs()).resolves.toEqual([{ id: "sync_run_1" }]);
    expect(mocks.listSyncJobs).toHaveBeenCalledWith();
    expect(mocks.runAdminApiRequest).toHaveBeenCalledTimes(1);
  });

  it("loads a sync job by id through the generated API client", async () => {
    mocks.getSyncJob.mockResolvedValue({ id: "sync_run_1" });

    const { fetchSyncJob } = await import("./admin");

    await expect(fetchSyncJob("sync_run_1")).resolves.toEqual({ id: "sync_run_1" });
    expect(mocks.getSyncJob).toHaveBeenCalledWith("sync_run_1");
    expect(mocks.runAdminApiRequest).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
npm run test --workspace @pmx/admin -- admin.test.ts
```

Expected: fails because `fetchSyncJobs` and `fetchSyncJob` are not exported.

- [ ] **Step 3: Add minimal wrappers**

Add to `apps/admin/src/api/admin.ts`:

```ts
export function fetchSyncJobs(): Promise<SyncJobRun[]> {
  return runAdminApiRequest(() => createAdminApiClient().admin.listSyncJobs())
}

export function fetchSyncJob(id: string): Promise<SyncJobRun> {
  return runAdminApiRequest(() => createAdminApiClient().admin.getSyncJob(id))
}
```

- [ ] **Step 4: Run the test and confirm GREEN**

Run:

```bash
npm run test --workspace @pmx/admin -- admin.test.ts
```

Expected: both wrapper tests pass.

## Task 2: Operations Route And View

**Files:**
- Create: `apps/admin/src/views/OperationsView.vue`
- Modify: `apps/admin/src/router/index.ts`
- Modify: `apps/admin/src/layouts/AdminLayout.vue`
- Modify: `apps/admin/src/styles/app.css`

- [ ] **Step 1: Write the failing e2e route test**

Extend `tests/e2e/admin.spec.ts` with a test that logs in, routes `GET /admin/sync/jobs`, opens `/#/operations`, and expects the heading `运维`, the safety copy, a seeded job id, and a `排队同步市场` button.

- [ ] **Step 2: Run the e2e test and confirm RED**

Run:

```bash
npm run test:e2e -- tests/e2e/admin.spec.ts --grep "operations console"
```

Expected: fails because `/operations` is not registered.

- [ ] **Step 3: Add the Vue operations console**

Create `OperationsView.vue` with:

```ts
import {
  enqueueMarketSync,
  fetchAdminGates,
  fetchSyncJobs,
  type AdminGate,
  type SyncJobRun
} from "@/api/admin";
```

The view loads jobs and gates on mount, displays summary cards, a safety alert, and a table with job type/status/timestamps/failure/result. The enqueue button calls `enqueueMarketSync()` and refreshes jobs.

- [ ] **Step 4: Add navigation**

Import `OperationsView` in `apps/admin/src/router/index.ts` and add child route:

```ts
{
  path: "operations",
  name: "Operations",
  component: OperationsView,
  meta: { title: "运维" }
}
```

Add sidebar item in `AdminLayout.vue`:

```ts
{ key: "/operations", icon: () => h(ControlOutlined), label: "运维" }
```

- [ ] **Step 5: Run Admin build**

Run:

```bash
npm run build --workspace @pmx/admin
```

Expected: Vue type-check and Vite build pass.

## Task 3: Documentation And Project Memory

**Files:**
- Modify: `docs/module-index.md`
- Modify: `docs/project-memory.md`

- [ ] **Step 1: Update module index**

Add a row for `Sync Operations Console` and note it depends on `queue-sync-readiness` API contracts.

- [ ] **Step 2: Update project memory**

Record that Admin `/operations` reads `SyncJobRun`, can enqueue market sync, and does not enable live CLOB submit or user fund movement.

- [ ] **Step 3: Check documentation diff**

Run:

```bash
git diff -- docs/modules/sync-operations-console.md docs/module-index.md docs/project-memory.md
```

Expected: docs describe stable facts only, with no temporary chat notes.

## Task 4: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Run targeted tests**

```bash
npm run test --workspace @pmx/admin
npm run build --workspace @pmx/admin
npm run test:e2e -- tests/e2e/admin.spec.ts
```

- [ ] **Step 2: Run full verification**

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

- [ ] **Step 3: Inspect git status**

```bash
git status -sb
```

Expected: only sync operations console code and documentation files are changed.
