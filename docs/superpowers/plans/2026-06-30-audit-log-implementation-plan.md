# Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centralized audit trail for authentication, paper order lifecycle, and portfolio reads, then expose it in Admin.

**Architecture:** Use the existing Prisma `AuditLog` table. API services write structured audit rows through `AuditLogService`; Admin reads the latest rows through a read-only `/admin/audit` endpoint.

**Tech Stack:** NestJS, Prisma, Jest, Vue 3, Ant Design Vue, TypeScript, Playwright.

---

## Acceptance Criteria

| Area | Standard |
|---|---|
| API write | Auth, order lifecycle, and portfolio reads write `AuditLog` rows with `userId`, `action`, and structured `metadata`. |
| API read | Only Admin can read latest audit logs through the Admin API. Regular users receive `403`. |
| Admin UI | `/audit` shows action, user email, time, and metadata summary in a read-only table. |
| Safety | Audit module must not store private keys, mnemonics, or signed secret material. |
| Scope | No real CLOB submit, rate limit, geoblock, export, or destructive audit operation is added. |
| Verification | Targeted API tests, Admin build, full `npm test`, `npm run build`, `npm run lint`, and `npm run test:e2e` pass. |

### Task 1: Central AuditLogService

**Files:**
- Create: `apps/api/src/compliance/audit-log.service.spec.ts`
- Create: `apps/api/src/compliance/audit-log.service.ts`
- Modify: `apps/api/src/compliance/compliance.module.ts`

- [ ] **Step 1: Write failing service tests**

Test that `record` creates a sanitized audit row and that private key style fields are removed from metadata.

- [ ] **Step 2: Run failing tests**

Run: `npm test --workspace @pmx/api -- audit-log`

Expected: fail because `audit-log.service.ts` does not exist.

- [ ] **Step 3: Implement service**

Create an injectable service with `record(input)` and metadata sanitization.

- [ ] **Step 4: Verify service tests**

Run: `npm test --workspace @pmx/api -- audit-log`

Expected: pass.

### Task 2: Wire AuditLogService Into API Actions

**Files:**
- Modify: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/orders/orders.service.spec.ts`
- Modify: `apps/api/src/orders/orders.service.ts`
- Modify: `apps/api/src/orders/orders.module.ts`
- Modify: `apps/api/src/portfolio/portfolio.service.spec.ts`
- Modify: `apps/api/src/portfolio/portfolio.service.ts`
- Modify: `apps/api/src/portfolio/portfolio.module.ts`

- [ ] **Step 1: Write failing integration tests**

Tests should expect calls to `auditLogService.record` for `auth.register`, `auth.login`, `order.previewed`, `order.signing_requested`, `order.signed`, `order.submitted`, and `portfolio.read`.

- [ ] **Step 2: Run failing tests**

Run: `npm test --workspace @pmx/api -- auth orders portfolio`

Expected: fail because services still use direct or missing audit writes.

- [ ] **Step 3: Implement audit calls**

Inject `AuditLogService` and write audit rows after successful actions.

- [ ] **Step 4: Verify API tests**

Run: `npm test --workspace @pmx/api -- auth orders portfolio`

Expected: pass.

### Task 3: Admin Audit API

**Files:**
- Modify: `apps/api/src/admin/admin.service.spec.ts`
- Modify: `apps/api/src/admin/admin.service.ts`
- Modify: `apps/api/src/admin/admin.controller.ts`

- [ ] **Step 1: Write failing AdminService test**

Test that admin users can list latest audit logs and non-admin users get `ForbiddenException`.

- [ ] **Step 2: Run failing tests**

Run: `npm test --workspace @pmx/api -- admin`

Expected: fail because `getAuditLogs` does not exist.

- [ ] **Step 3: Implement Admin API**

Add `getAuditLogs(operator)` and `GET /admin/audit`.

- [ ] **Step 4: Verify admin tests**

Run: `npm test --workspace @pmx/api -- admin`

Expected: pass.

### Task 4: Admin Audit Page

**Files:**
- Modify: `apps/admin/src/api/admin.ts`
- Create: `apps/admin/src/views/AuditView.vue`
- Modify: `apps/admin/src/router/index.ts`
- Modify: `apps/admin/src/styles/app.css`

- [ ] **Step 1: Add API type and page**

Create a read-only audit table with refresh button, action tags, user email, time, and metadata summary.

- [ ] **Step 2: Build Admin**

Run: `npm run build --workspace @pmx/admin`

Expected: pass.

### Task 5: Docs and Full Verification

**Files:**
- Modify: `docs/project-memory.md`
- Modify: `docs/module-index.md`
- Modify: `docs/modules/audit-risk.md`

- [ ] **Step 1: Update docs**

Record implementation facts, boundaries, and verification commands.

- [ ] **Step 2: Targeted verification**

Run:

```bash
npm test --workspace @pmx/api -- audit-log auth orders portfolio admin
npm run build --workspace @pmx/admin
```

- [ ] **Step 3: Full verification**

Run:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```
