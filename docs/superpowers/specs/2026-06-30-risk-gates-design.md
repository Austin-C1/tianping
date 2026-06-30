# Risk Gates Design

## Purpose

`risk-gates` provides a read-only Admin risk report for the conditions that must be reviewed before any real CLOB submission is allowed.

The module does not enable live trading. It makes the current blockers visible and keeps real order submission blocked by design.

## Scope

In scope:

- Admin-only API endpoint for risk gate status.
- Gate report built from existing operational data:
  - Order Router environment.
  - Market snapshot count.
  - Market quote snapshot count.
  - EOA wallet count.
  - ready Deposit Wallet count.
  - latest failed relayer transaction.
  - open rate-limit event count.
  - latest audit log.
- Admin `/risk` page that shows overall live-order readiness and each gate.
- e2e check that the risk page renders real API data.
- Project memory and module index updates.

Out of scope:

- No database schema changes.
- No mutation endpoint.
- No rate-limit resolution workflow.
- No geo-blocking.
- No real CLOB submit.
- No manual approval toggle.

## Architecture

The API adds `AdminService.getRiskGateReport()` and exposes it through `GET /admin/risk/gates`. The method uses existing Prisma models and `OrderRouterConfigService`, then returns a compact report with `canSubmitLiveOrders`, counts, and a gate table.

The Admin app adds `RiskView.vue`, reusing existing Ant Design Vue table/card patterns. The page is read-only and displays the report with Chinese labels.

## Gate Rules

| Gate | READY | PENDING | BLOCKED |
|---|---|---|---|
| Order Router safe mode | `ORDER_ROUTER_MODE` is `preview` or `paper` | none | `ORDER_ROUTER_MODE=live` |
| Market data sync | market snapshots exist | no market snapshots | none |
| Market quote sync | quote snapshots exist | no quote snapshots | none |
| Wallet binding proof | EOA wallets exist | no EOA wallets | none |
| Deposit Wallet readiness | ready Deposit Wallet exists | no ready Deposit Wallet | latest relayer transaction failed |
| Audit trail | at least one audit log exists | no audit logs | none |
| Risk event review | no rate-limit events | rate-limit events exist | none |
| Manual live approval | none | none | always blocked until a later explicit module adds approval |

`canSubmitLiveOrders` is true only when `liveTradingEnabled` is true and every blocking gate is `READY`. Because manual live approval is intentionally blocked in this module, the value remains false.

## Acceptance Criteria

| Area | Standard |
|---|---|
| API auth | `GET /admin/risk/gates` requires Admin role; regular users receive `403`. |
| API data | Response includes generated time, environment mode, live enablement, `canSubmitLiveOrders`, counts, and gate rows. |
| Safety | Real CLOB submit remains blocked; no mutation endpoint or approval toggle is added. |
| Admin UI | `/risk` shows overall live-order status, blocking/warning counts, and a read-only gate table. |
| Documentation | `docs/project-memory.md`, `docs/module-index.md`, and `docs/modules/risk-gates.md` are updated. |
| Verification | Targeted API tests, Admin build, e2e risk page check, and full verification pass. |
