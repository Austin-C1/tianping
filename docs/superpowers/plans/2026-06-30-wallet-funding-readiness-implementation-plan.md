# Wallet Funding Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cached Deposit Wallet pUSD balance and CLOB exchange allowance to Admin risk gate readiness.

**Architecture:** Extend `AdminService.getRiskGateReport()` with a single read-only funding gate derived from existing `DepositWallet` cache fields. The Admin Risk page already renders gate rows, so the frontend change is a title mapping and browser check.

**Tech Stack:** NestJS, Prisma, Jest, Vue 3, Ant Design Vue, Playwright.

---

## Files

| File | Responsibility |
|---|---|
| `apps/api/src/admin/admin.service.spec.ts` | TDD tests for `funding-readiness` gate. |
| `apps/api/src/admin/admin.service.ts` | Query cached Deposit Wallet funding and build the gate. |
| `apps/admin/src/views/RiskView.vue` | Add Chinese label for funding gate. |
| `tests/e2e/admin.spec.ts` | Check the risk page displays the funding gate. |
| `docs/modules/wallet-funding-readiness.md` | Module memory and acceptance. |
| `docs/project-memory.md` | Active module and verified facts. |
| `docs/module-index.md` | Module status and verification commands. |

## Task 1: API Funding Gate

- [ ] Add a failing test in `apps/api/src/admin/admin.service.spec.ts` where the latest ready Deposit Wallet has:
  - `pUsdBalance: "50"`
  - `exchangeAllowance: "100"`
  - `balanceAllowanceUpdatedAt` within five minutes
  - Expected gate: `key: "funding-readiness"`, `status: "READY"`, `blocking: true`.

- [ ] Add a failing test where the cache is stale:
  - `balanceAllowanceUpdatedAt` older than five minutes.
  - Expected gate: `key: "funding-readiness"`, `status: "PENDING"`, evidence mentions stale cache.

- [ ] Run:

```bash
npm test --workspace @pmx/api -- admin
```

Expected: fail because `funding-readiness` is not implemented.

- [ ] Implement `fundingReadinessGate()` in `apps/api/src/admin/admin.service.ts`.
- [ ] Add a Prisma `depositWallet.findFirst` query selecting `balanceAllowanceUpdatedAt`, `exchangeAllowance`, `pUsdBalance`, and `updatedAt`.
- [ ] Insert the gate before `manual-live-approval`.
- [ ] Run the same test again.

Expected: pass.

## Task 2: Admin Risk Page Label

- [ ] Add `'funding-readiness': '资金与授权准备状态'` in `apps/admin/src/views/RiskView.vue`.
- [ ] Update the Admin risk e2e test in `tests/e2e/admin.spec.ts` to expect `资金与授权准备状态`.
- [ ] Run:

```bash
npm run build --workspace @pmx/admin
npm run test:e2e
```

Expected: both pass.

## Task 3: Documentation and Final Verification

- [ ] Add `docs/modules/wallet-funding-readiness.md`.
- [ ] Update `docs/module-index.md`.
- [ ] Update `docs/project-memory.md`.
- [ ] Run:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

Expected: all pass.

## Self-Review

- The plan is read-only for Admin.
- The plan does not add live CLOB submit.
- The plan does not make chain calls from Admin risk gates.
- The plan uses existing Deposit Wallet cache data.
