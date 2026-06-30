# Manual Live Approval Module

## Purpose

Let Admin operators record, inspect, approve, and revoke live-trading readiness without enabling real CLOB submission.

## Scope

In scope:

- Admin-only live approval status API.
- Admin-only approve and revoke API.
- `LiveTradingApproval` persistence with operator, reason, approval time, and revoke details.
- `AuditLog` records for approve and revoke.
- Admin `/risk` display and controls for the manual approval state.
- Risk gate report uses the active approval record for the `manual-live-approval` gate.

Out of scope:

- No real CLOB submit.
- No live order routing implementation.
- No order submit mode changes.
- No user funding or balance mutation.
- No automatic approval expiry or multi-approver workflow.

## Acceptance Criteria

| Area | Standard |
|---|---|
| API auth | Only Admin can call `GET /admin/live-approval`, `POST /admin/live-approval/approve`, and `POST /admin/live-approval/revoke`; regular users receive `403`. |
| Data | Approval records save approving user, reason, and approval time. |
| Revoke | Revoking updates the active approval with revoking user, reason, and revoke time. |
| Audit | Approve writes `live_approval.approved`; revoke writes `live_approval.revoked`. |
| Risk gate | `GET /admin/risk/gates` reports `manual-live-approval` from the database instead of a fixed blocked state. |
| Admin UI | `/risk` shows approval status, reason, operator, approval time, revoke details, and approve/revoke controls. |
| Safety | The UI and API copy state that approval does not enable real CLOB submit. |
| Verification | Targeted API tests, Admin build, e2e, and full verification pass. |

## Current Files

| File | Role |
|---|---|
| `apps/api/prisma/schema.prisma` | Defines `LiveTradingApproval`. |
| `apps/api/prisma/migrations/20260630203000_add_live_trading_approval/migration.sql` | Adds the approval table and active-record index. |
| `apps/api/src/admin/admin.service.ts` | Reads, approves, revokes, audits, and feeds the risk gate. |
| `apps/api/src/admin/admin.controller.ts` | Exposes Admin-only live approval endpoints. |
| `apps/api/src/admin/dto/live-approval.dto.ts` | Validates approve/revoke reason input. |
| `apps/api/src/admin/admin.service.spec.ts` | API behavior tests. |
| `apps/api/src/admin/admin.controller.spec.ts` | Controller route forwarding tests. |
| `apps/admin/src/api/admin.ts` | Admin client types and calls. |
| `apps/admin/src/views/RiskView.vue` | Risk page approval status and controls. |
| `apps/admin/src/styles/app.css` | Approval panel layout helpers. |
| `tests/e2e/admin.spec.ts` | Browser verification for the Admin risk page. |

## Current State

- Implemented on 2026-06-30.
- `LiveTradingApproval` records `APPROVED` and `REVOKED` states, reasons, operators, approval time, and revoke time.
- Admin-only APIs exist at `GET /admin/live-approval`, `POST /admin/live-approval/approve`, and `POST /admin/live-approval/revoke`.
- Approve writes `live_approval.approved`; revoke writes `live_approval.revoked`.
- The `manual-live-approval` risk gate is `READY` only when an active approval row exists.
- Approval does not enable real CLOB submit; `order-router-safe-mode` still blocks `ORDER_ROUTER_MODE=live`.
- Admin `/risk` displays the approval state and controls with explicit safety copy.

## Verification

Targeted verification passed on 2026-06-30:

```bash
npm test --workspace @pmx/api -- admin
npm run build --workspace @pmx/admin
npm run test:e2e -- tests/e2e/admin.spec.ts
```

Full project verification passed on 2026-06-30:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```
