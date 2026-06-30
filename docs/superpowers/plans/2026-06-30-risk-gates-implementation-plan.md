# Risk Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only Admin risk gate report that shows why real CLOB submission is still blocked.

**Architecture:** Add an Admin API read model at `GET /admin/risk/gates`, backed by existing Prisma data and `OrderRouterConfigService`. Add a Vue Admin `/risk` page that displays the report without any mutation controls.

**Tech Stack:** NestJS, Prisma, Jest, Vue 3, Ant Design Vue, Playwright.

---

## Files

| File | Responsibility |
|---|---|
| `apps/api/src/admin/admin.service.spec.ts` | TDD coverage for Admin risk gate report and non-admin rejection. |
| `apps/api/src/admin/admin.service.ts` | Risk gate report types and `getRiskGateReport()` implementation. |
| `apps/api/src/admin/admin.controller.ts` | `GET /admin/risk/gates` route. |
| `apps/admin/src/api/admin.ts` | Admin client types and `fetchRiskGateReport()`. |
| `apps/admin/src/router/index.ts` | Route `/risk` to real `RiskView`. |
| `apps/admin/src/views/RiskView.vue` | Read-only risk gate page. |
| `apps/admin/src/styles/app.css` | Small risk-page display styles. |
| `tests/e2e/admin.spec.ts` | Admin risk page browser verification. |
| `docs/modules/risk-gates.md` | Module memory and acceptance. |
| `docs/project-memory.md` | Active module and verified facts. |
| `docs/module-index.md` | Module status and verification commands. |

## Task 1: API Risk Gate Report

- [ ] Write failing Jest tests in `apps/api/src/admin/admin.service.spec.ts`.
  - Expect `getRiskGateReport({ role: "ADMIN" })` to return:
    - `mode`
    - `liveTradingEnabled`
    - `canSubmitLiveOrders: false`
    - `blockingCount`
    - `warningCount`
    - gate rows including `manual-live-approval`, `order-router-safe-mode`, `risk-event-review`, and `audit-trail`.
  - Expect `getRiskGateReport({ role: "USER" })` to reject with `ForbiddenException`.
- [ ] Run:

```bash
npm test --workspace @pmx/api -- admin
```

Expected: fail because `getRiskGateReport` does not exist.

- [ ] Implement `AdminRiskGate`, `AdminRiskGateReport`, and `getRiskGateReport()` in `apps/api/src/admin/admin.service.ts`.
- [ ] Add `@Get("risk/gates")` in `apps/api/src/admin/admin.controller.ts`.
- [ ] Run the same test again.

Expected: pass.

## Task 2: Admin Risk Page

- [ ] Add `RiskGateReport` client types and `fetchRiskGateReport()` to `apps/admin/src/api/admin.ts`.
- [ ] Create `apps/admin/src/views/RiskView.vue`.
  - Load the report on mount.
  - Show summary metrics:
    - live-order status.
    - blocking count.
    - warning count.
    - router mode.
  - Show a read-only table of gates.
- [ ] Route `/risk` to `RiskView.vue` in `apps/admin/src/router/index.ts`.
- [ ] Add minimal CSS classes for gate cells and summary labels.
- [ ] Run:

```bash
npm run build --workspace @pmx/admin
```

Expected: pass.

## Task 3: Browser Verification

- [ ] Add a Playwright test in `tests/e2e/admin.spec.ts`:
  - login as `admin@pmx.local`.
  - open `/#/risk`.
  - expect heading `风险`.
  - expect `真实交易状态`.
  - expect `不可提交真实订单`.
  - expect `手动实盘批准`.
- [ ] Run:

```bash
npm run test:e2e
```

Expected: pass.

## Task 4: Documentation and Final Verification

- [ ] Update `docs/modules/risk-gates.md`.
- [ ] Update `docs/module-index.md`.
- [ ] Update `docs/project-memory.md`.
- [ ] Restart API if needed so local server reflects compiled source.
- [ ] Run:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Expected: all pass.

## Self-Review

- The plan does not add live trading.
- The plan does not add mutation endpoints.
- The plan uses current project module-memory rules.
- The plan verifies both API behavior and Admin browser rendering.
