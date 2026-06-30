# Manual Live Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Admin-only manual live approval record and audit flow that feeds the risk page without enabling real CLOB submit.

**Architecture:** Store one approval row per approval event and treat rows with `revokedAt = null` as active. Admin service owns the approval API, audit writes, and the `manual-live-approval` risk gate; the Admin `/risk` page reads status separately and refreshes both status and gate report after mutations.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Jest, Vue 3, Ant Design Vue, Playwright.

---

## File Structure

| File | Responsibility |
|---|---|
| `docs/modules/manual-live-approval.md` | Module memory and boundaries. |
| `apps/api/prisma/schema.prisma` | `LiveTradingApproval` model and `User` relations. |
| `apps/api/prisma/migrations/20260630203000_add_live_trading_approval/migration.sql` | Database table, foreign keys, and active approval unique index. |
| `apps/api/src/admin/dto/live-approval.dto.ts` | Reason DTO for approve/revoke. |
| `apps/api/src/admin/admin.service.ts` | Approval status, approve, revoke, audit writes, and risk gate integration. |
| `apps/api/src/admin/admin.controller.ts` | Admin endpoints. |
| `apps/api/src/admin/admin.module.ts` | Import `ComplianceModule`. |
| `apps/api/src/admin/admin.service.spec.ts` | Service red/green tests. |
| `apps/api/src/admin/admin.controller.spec.ts` | Controller route forwarding tests. |
| `apps/admin/src/api/admin.ts` | Client types and calls. |
| `apps/admin/src/views/RiskView.vue` | Approval panel and controls. |
| `apps/admin/src/styles/app.css` | Small layout helpers for the approval panel. |
| `tests/e2e/admin.spec.ts` | Browser assertions for the risk page. |
| `docs/project-memory.md` | Stable module outcome and verification record. |
| `docs/module-index.md` | Module index row and dependency note. |

### Task 1: API Red Tests

**Files:**
- Modify: `apps/api/src/admin/admin.service.spec.ts`
- Create: `apps/api/src/admin/admin.controller.spec.ts`

- [ ] **Step 1: Write failing service tests**

Add tests that expect:

```ts
await expect(service.getLiveApproval({ role: "USER", userId: "user_1" })).rejects.toBeInstanceOf(ForbiddenException);
await expect(service.approveLiveTrading({ role: "USER", userId: "user_1" }, { reason: "ready" })).rejects.toBeInstanceOf(ForbiddenException);
await expect(service.revokeLiveTrading({ role: "USER", userId: "user_1" }, { reason: "pause" })).rejects.toBeInstanceOf(ForbiddenException);
```

Add admin tests that expect:

```ts
expect(prisma.liveTradingApproval.findFirst).toHaveBeenCalledWith({
  include: expect.any(Object),
  orderBy: { approvedAt: "desc" },
  where: { revokedAt: null }
});
expect(prisma.liveTradingApproval.create).toHaveBeenCalledWith(expect.objectContaining({
  data: expect.objectContaining({
    approvedById: "admin_1",
    approvalReason: "funding and audit reviewed"
  })
}));
expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
  action: "live_approval.approved"
}));
expect(prisma.liveTradingApproval.update).toHaveBeenCalledWith(expect.objectContaining({
  data: expect.objectContaining({
    revokedById: "admin_1",
    revokeReason: "operator revoked"
  })
}));
expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
  action: "live_approval.revoked"
}));
```

- [ ] **Step 2: Write failing controller tests**

Create route-forwarding tests that instantiate `AdminController` and verify:

```ts
controller.getLiveApproval(request);
controller.approveLiveTrading({ reason: "ready" }, request);
controller.revokeLiveTrading({ reason: "pause" }, request);
```

delegate to the matching `AdminService` methods with `request.user`.

- [ ] **Step 3: Verify red**

Run:

```bash
npm test --workspace @pmx/api -- admin
```

Expected: fail because live approval service/controller methods and Prisma mock fields do not exist yet.

### Task 2: Prisma Model And Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260630203000_add_live_trading_approval/migration.sql`

- [ ] **Step 1: Add model**

Add `LiveTradingApproval` with:

```prisma
model LiveTradingApproval {
  id             String    @id @default(cuid())
  approvedById   String
  approvalReason String
  approvedAt     DateTime  @default(now())
  revokedById    String?
  revokeReason   String?
  revokedAt      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  approvedBy     User      @relation("LiveTradingApprovalApprovedBy", fields: [approvedById], references: [id], onDelete: Restrict)
  revokedBy      User?     @relation("LiveTradingApprovalRevokedBy", fields: [revokedById], references: [id], onDelete: SetNull)

  @@index([approvedById, approvedAt])
  @@index([revokedAt, approvedAt])
}
```

Add matching `User` relations:

```prisma
liveApprovalsApproved LiveTradingApproval[] @relation("LiveTradingApprovalApprovedBy")
liveApprovalsRevoked  LiveTradingApproval[] @relation("LiveTradingApprovalRevokedBy")
```

- [ ] **Step 2: Add migration**

Create SQL table, foreign keys, indexes, and a partial unique index:

```sql
CREATE TABLE "LiveTradingApproval" (
  "id" TEXT NOT NULL,
  "approvedById" TEXT NOT NULL,
  "approvalReason" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedById" TEXT,
  "revokeReason" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveTradingApproval_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LiveTradingApproval"
  ADD CONSTRAINT "LiveTradingApproval_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LiveTradingApproval"
  ADD CONSTRAINT "LiveTradingApproval_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LiveTradingApproval_approvedById_approvedAt_idx"
  ON "LiveTradingApproval"("approvedById", "approvedAt");

CREATE INDEX "LiveTradingApproval_revokedAt_approvedAt_idx"
  ON "LiveTradingApproval"("revokedAt", "approvedAt");

CREATE UNIQUE INDEX "LiveTradingApproval_one_active_idx"
  ON "LiveTradingApproval"((1))
  WHERE "revokedAt" IS NULL;
```

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
npm run prisma:generate
```

Expected: Prisma client generation succeeds.

### Task 3: API Implementation

**Files:**
- Create: `apps/api/src/admin/dto/live-approval.dto.ts`
- Modify: `apps/api/src/admin/admin.service.ts`
- Modify: `apps/api/src/admin/admin.controller.ts`
- Modify: `apps/api/src/admin/admin.module.ts`

- [ ] **Step 1: Add DTO**

```ts
import { IsString, MaxLength, MinLength } from "class-validator";

export class LiveApprovalReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
```

- [ ] **Step 2: Inject AuditLogService**

Import `ComplianceModule` in `AdminModule` and add `AuditLogService` to the `AdminService` constructor.

- [ ] **Step 3: Implement status, approve, and revoke**

Add service methods:

```ts
getLiveApproval(operator: Operator): Promise<AdminLiveApprovalStatus>
approveLiveTrading(operator: Operator, dto: LiveApprovalReasonDto): Promise<AdminLiveApprovalStatus>
revokeLiveTrading(operator: Operator, dto: LiveApprovalReasonDto): Promise<AdminLiveApprovalStatus>
```

Use `requireAdmin`, active `revokedAt: null` lookups, `liveTradingApproval.create`, `liveTradingApproval.update`, and audit actions `live_approval.approved` / `live_approval.revoked`.

- [ ] **Step 4: Add controller routes**

Add:

```ts
@Get("live-approval")
@Post("live-approval/approve")
@Post("live-approval/revoke")
```

- [ ] **Step 5: Connect risk gate**

Fetch the active approval in `getRiskGateReport` and replace the fixed blocked gate with a helper that returns `READY` when active approval exists and `BLOCKED` otherwise. Keep `canSubmitLiveOrders` controlled by all gates and environment; do not add live submit code.

- [ ] **Step 6: Verify green**

Run:

```bash
npm test --workspace @pmx/api -- admin
```

Expected: pass.

### Task 4: Admin UI Red/Green

**Files:**
- Modify: `apps/admin/src/api/admin.ts`
- Modify: `apps/admin/src/views/RiskView.vue`
- Modify: `apps/admin/src/styles/app.css`

- [ ] **Step 1: Add client types and calls**

Add `LiveApprovalStatus`, `LiveApprovalReason`, `fetchLiveApproval`, `approveLiveTrading`, and `revokeLiveTrading`.

- [ ] **Step 2: Add approval panel**

Add an Admin `/risk` panel that displays status, reason, approved by, approved time, revoke details, and the fixed safety copy:

```text
这里只记录人工批准状态，不启用真实 CLOB submit。
```

Use a reason textarea and two buttons: approve when inactive, revoke when active.

- [ ] **Step 3: Refresh after mutation**

After approve/revoke succeeds, reload both live approval status and risk gate report.

- [ ] **Step 4: Build Admin**

Run:

```bash
npm run build --workspace @pmx/admin
```

Expected: build succeeds.

### Task 5: E2E And Docs

**Files:**
- Modify: `tests/e2e/admin.spec.ts`
- Modify: `docs/project-memory.md`
- Modify: `docs/module-index.md`
- Modify: `docs/modules/manual-live-approval.md`

- [ ] **Step 1: Add e2e assertions**

Update the Admin risk test to assert:

```ts
await expect(page.getByText("这里只记录人工批准状态，不启用真实 CLOB submit。")).toBeVisible();
await expect(page.getByRole("button", { name: "批准实盘准备" })).toBeVisible();
await expect(page.getByRole("button", { name: "撤销批准" })).toBeVisible();
```

Use route mocks if needed to cover both inactive and active states without changing production data.

- [ ] **Step 2: Update docs**

Mark the module implemented, add the module to `docs/module-index.md`, and record final verification commands in `docs/project-memory.md`.

- [ ] **Step 3: Run final verification**

Run:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Expected: all commands exit 0.
