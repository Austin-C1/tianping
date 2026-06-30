# Wallet Funding Readiness Module

## Purpose

Show cached Deposit Wallet pUSD balance and CLOB exchange allowance readiness in Admin risk gates.

## Scope

In scope:

- Admin `funding-readiness` gate.
- Gate based on existing `DepositWallet` cache fields.
- Admin `/risk` display.
- Tests and documentation.

Out of scope:

- No new chain call.
- No automatic balance refresh.
- No real CLOB submit.
- No manual approval toggle.
- No database schema change.

## Acceptance Criteria

| Area | Standard |
|---|---|
| API report | `GET /admin/risk/gates` includes a `funding-readiness` gate. |
| Ready state | Fresh cached `pUsdBalance > 0` and `exchangeAllowance > 0` mark the gate `READY`. |
| Pending state | Missing cache, stale cache, no pUSD, or no allowance mark the gate `PENDING`. |
| Safety | Admin risk gates do not refresh balances, call chain providers, or enable live trading. |
| Admin UI | `/risk` shows `资金与授权准备状态`. |
| Verification | Targeted API tests, Admin build, e2e, and full verification pass. |

## Current Files

| File | Role |
|---|---|
| `apps/api/src/admin/admin.service.ts` | Build funding-readiness gate. |
| `apps/api/src/admin/admin.service.spec.ts` | Funding gate API tests. |
| `apps/admin/src/views/RiskView.vue` | Funding gate Chinese label. |
| `tests/e2e/admin.spec.ts` | Browser verification. |

## Current State

- Admin risk report includes `funding-readiness`.
- Admin `/risk` displays the gate as `资金与授权准备状态`.
- Fresh positive cached pUSD and allowance mark the gate `READY`.
- Missing cache, stale cache, no pUSD, or missing allowance mark the gate `PENDING`.
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
