# Wallet Funding Readiness Design

## Purpose

`wallet-funding-readiness` makes cached Deposit Wallet pUSD balance and CLOB exchange allowance visible in Admin risk gates.

The module does not perform chain writes, does not auto-refresh balances, and does not enable live trading. It uses existing Deposit Wallet cache columns already maintained by `WalletFundingService`.

## Scope

In scope:

- Add a funding-readiness gate to `GET /admin/risk/gates`.
- Classify cached Deposit Wallet funding as:
  - ready: ready Deposit Wallet has fresh pUSD balance and exchange allowance greater than zero.
  - pending: no ready funded wallet exists, cache is missing, cache is stale, pUSD is zero, or allowance is zero.
- Show funding evidence in the Admin `/risk` table.
- Add API and e2e verification.
- Update project module memory.

Out of scope:

- No new database columns.
- No new chain/RPC call.
- No new CLOB submit behavior.
- No automatic funding refresh.
- No approval toggle.
- No user fund transfer flow.

## Architecture

The API keeps `AdminService.getRiskGateReport()` as the read model. It adds one Prisma query for the latest ready Deposit Wallet with balance/allowance cache fields and creates a `funding-readiness` gate from that row.

The Admin `/risk` page already renders arbitrary gate rows, so only the Chinese title map and browser expectation need to be updated.

## Gate Rules

| Input | Gate status | Evidence |
|---|---|---|
| No ready Deposit Wallet with funding cache | `PENDING` | No ready Deposit Wallet funding cache exists. |
| Cache missing | `PENDING` | Deposit Wallet funding cache is missing. |
| Cache older than 5 minutes | `PENDING` | Deposit Wallet funding cache is stale. |
| pUSD balance <= 0 | `PENDING` | Deposit Wallet has no pUSD. |
| exchange allowance <= 0 | `PENDING` | CLOB exchange allowance is missing. |
| Fresh pUSD > 0 and allowance > 0 | `READY` | pUSD and CLOB exchange allowance are cached and positive. |

`funding-readiness` is a blocking gate. Even when it is `READY`, `manual-live-approval` remains `BLOCKED`, so `canSubmitLiveOrders` remains false.

## Acceptance Criteria

| Area | Standard |
|---|---|
| API report | `GET /admin/risk/gates` includes `funding-readiness`. |
| Funding rules | Fresh positive pUSD and allowance mark the gate `READY`; stale/missing/zero values mark it `PENDING`. |
| Safety | No chain refresh, mutation endpoint, live CLOB submit, or approval toggle is added. |
| Admin UI | `/risk` shows the funding gate as `资金与授权准备状态`. |
| Documentation | `docs/project-memory.md`, `docs/module-index.md`, and `docs/modules/wallet-funding-readiness.md` are updated. |
| Verification | Targeted API tests, Admin build, e2e risk page check, and full verification pass. |
