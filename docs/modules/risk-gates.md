# Risk Gates Module

## Purpose

Expose the current real-trading blockers in Admin without enabling real CLOB submit.

## Scope

In scope:

- Admin-only risk gate API.
- Read-only Admin `/risk` page.
- Gate report from existing operational data.
- Verification through Jest, Admin build, and Playwright.

Out of scope:

- No real CLOB submit.
- No manual approval toggle.
- No rate-limit resolution workflow.
- No database schema change.
- No geo-blocking.

## Acceptance Criteria

| Area | Standard |
|---|---|
| API auth | Only Admin can call `GET /admin/risk/gates`; regular users receive `403`. |
| API report | Response includes mode, live enablement, `canSubmitLiveOrders`, blocking count, warning count, and gate rows. |
| Safety | `canSubmitLiveOrders` stays false because manual live approval is intentionally blocked in this module. |
| Admin UI | `/risk` shows live-order status, blocking count, warning count, router mode, and a read-only gate table. |
| Scope | No mutation endpoint, approval toggle, live CLOB submit, geoblock, or DB schema change is added. |
| Verification | Targeted API tests, Admin build, `npm test`, `npm run build`, `npm run lint`, and `npm run test:e2e` pass. |

## Current Files

| File | Role |
|---|---|
| `apps/api/src/admin/admin.service.ts` | Build risk gate report. |
| `apps/api/src/admin/admin.controller.ts` | Expose `GET /admin/risk/gates`. |
| `apps/api/src/admin/admin.service.spec.ts` | API tests. |
| `apps/admin/src/api/admin.ts` | Admin client type and fetch helper. |
| `apps/admin/src/views/RiskView.vue` | Read-only risk gate page. |
| `apps/admin/src/router/index.ts` | Route `/risk` to the real page. |
| `tests/e2e/admin.spec.ts` | Browser verification. |

## Current State

- `GET /admin/risk/gates` is implemented and Admin-only.
- Admin `/risk` is implemented as a read-only table and summary.
- `canSubmitLiveOrders` remains false because `manual-live-approval` is blocked.
- Full project verification passed.

## Verification

Targeted verification passed on 2026-06-30:

```bash
npm test --workspace @pmx/api -- admin
npm run build --workspace @pmx/admin
npm run test:e2e
```

Full project verification passed on 2026-06-30:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```
