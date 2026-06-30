# API Repositories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repository boundaries for existing API database access so order, wallet, funding, and audit workflows no longer spread Prisma delegate calls across business services.

**Architecture:** Keep the current NestJS modules and Prisma schema. Add repository interfaces, provider tokens, and Prisma-backed implementations under `apps/api/src/infrastructure/repositories`, then inject those repositories into existing services. This slice does not move code into `libs`, generate OpenAPI clients, or change database tables.

**Tech Stack:** NestJS, Prisma, Jest, TypeScript.

---

## Acceptance Checklist

- [x] Add `RepositoriesModule` with provider tokens and Prisma implementations.
- [x] Add `OrdersRepository` for order preview market lookup and preview order creation.
- [x] Add `WalletsRepository` for wallet challenges, EOA wallet binding, and latest wallet lookup.
- [x] Add `DepositWalletsRepository` for Deposit Wallet lifecycle rows, wallet operations, and relayer transactions.
- [x] Add `FundingRepository` for Deposit Wallet pUSD balance and exchange allowance cache reads/writes.
- [x] Add `AuditLogsRepository` for auth audit log writes.
- [x] Replace direct Prisma calls in `OrdersService` for order preview workflow.
- [x] Replace direct Prisma calls in wallet services for wallet readiness, proof, funding, and Deposit Wallet lifecycle.
- [x] Replace direct Prisma audit-log writes in `AuthService`.
- [x] Keep Prisma direct access in user/admin/market services out of scope for this slice.
- [x] Run targeted repository/service tests after each module.
- [x] Run `npm run test --workspace @pmx/api`.
- [x] Run `npm test`.
- [x] Run `git diff --check`.

## Module Order

| 顺序 | 模块 | 验收标准 |
|---:|---|---|
| 1 | Repository shell | Nest provider tokens exist, Prisma implementations are bound by `RepositoriesModule`, and boundary tests pass. |
| 2 | Orders repository | `OrdersService` uses `OrdersRepository`; order preview behavior and tests remain unchanged. |
| 3 | Wallets repository | `WalletProofService` and `WalletReadinessService` use wallet/deposit repositories; wallet proof/readiness tests pass. |
| 4 | Deposit Wallet repository | `DepositWalletService` uses wallet/deposit repositories; lifecycle tests pass. |
| 5 | Funding repository | `WalletFundingService` uses `FundingRepository`; funding tests pass. |
| 6 | Audit repository | `AuthService` writes audit logs through `AuditLogsRepository`; auth tests pass. |
| 7 | Full verification | API tests, root tests, and diff checks pass. |

## Task 1: Repository Shell

**Files:**
- Create: `apps/api/src/infrastructure/repositories/repository.tokens.ts`
- Create: `apps/api/src/infrastructure/repositories/repository.types.ts`
- Create: `apps/api/src/infrastructure/repositories/repositories.module.ts`
- Create: `apps/api/src/infrastructure/repositories/repositories.module.spec.ts`

- [x] **Step 1: Write the failing provider-boundary test**

Run: `npm run test --workspace @pmx/api -- repositories.module.spec.ts`

Expected: FAIL because `RepositoriesModule` does not exist.

- [x] **Step 2: Add provider tokens, interfaces, and module**

Create the repository token constants and empty interface boundaries first, then bind placeholder Prisma repository classes as providers.

- [x] **Step 3: Run module test**

Run: `npm run test --workspace @pmx/api -- repositories.module.spec.ts`

Expected: PASS.

## Task 2: Orders Repository

**Files:**
- Create: `apps/api/src/infrastructure/repositories/prisma-orders.repository.ts`
- Modify: `apps/api/src/infrastructure/repositories/repository.types.ts`
- Modify: `apps/api/src/infrastructure/repositories/repositories.module.ts`
- Modify: `apps/api/src/orders/orders.service.ts`
- Modify: `apps/api/src/orders/orders.service.spec.ts`
- Modify: `apps/api/src/orders/orders.module.ts`

- [x] **Step 1: Write failing service expectation**

Update `orders.service.spec.ts` so the service receives an `OrdersRepository` mock and expects `findPreviewMarket()` / `createPreviewOrder()` calls instead of Prisma delegates.

Run: `npm run test --workspace @pmx/api -- orders.service.spec.ts`

Expected: FAIL because `OrdersService` still injects `PrismaService`.

- [x] **Step 2: Implement `PrismaOrdersRepository` and inject it**

Move market lookup and preview order creation query shapes into `PrismaOrdersRepository`. Keep all pricing, readiness, and CLOB draft logic in `OrdersService`.

- [x] **Step 3: Run orders tests**

Run: `npm run test --workspace @pmx/api -- orders.service.spec.ts orders.module.spec.ts`

Expected: PASS.

## Task 3: Wallets Repository

**Files:**
- Create: `apps/api/src/infrastructure/repositories/prisma-wallets.repository.ts`
- Modify: `apps/api/src/infrastructure/repositories/repository.types.ts`
- Modify: `apps/api/src/infrastructure/repositories/repositories.module.ts`
- Modify: `apps/api/src/wallets/wallet-proof.service.ts`
- Modify: `apps/api/src/wallets/wallet-proof.service.spec.ts`
- Modify: `apps/api/src/wallets/wallet-readiness.service.ts`
- Modify: `apps/api/src/wallets/wallet-readiness.service.spec.ts`
- Modify: `apps/api/src/wallets/wallets.module.ts`

- [x] **Step 1: Write failing wallet service expectations**

Update wallet proof/readiness tests to use repository mocks instead of Prisma mocks.

Run: `npm run test --workspace @pmx/api -- wallet-proof.service.spec.ts wallet-readiness.service.spec.ts`

Expected: FAIL because the services still inject `PrismaService`.

- [x] **Step 2: Implement `PrismaWalletsRepository` and inject it**

Repository owns wallet challenge creation, challenge lookup, wallet upsert, challenge consumption, and latest wallet lookup.

- [x] **Step 3: Run wallet tests**

Run: `npm run test --workspace @pmx/api -- wallet-proof.service.spec.ts wallet-readiness.service.spec.ts`

Expected: PASS.

## Task 4: Deposit Wallet Repository

**Files:**
- Create: `apps/api/src/infrastructure/repositories/prisma-deposit-wallets.repository.ts`
- Modify: `apps/api/src/infrastructure/repositories/repository.types.ts`
- Modify: `apps/api/src/infrastructure/repositories/repositories.module.ts`
- Modify: `apps/api/src/wallets/deposit-wallet.service.ts`
- Modify: `apps/api/src/wallets/deposit-wallet.service.spec.ts`

- [x] **Step 1: Write failing Deposit Wallet service expectations**

Update `deposit-wallet.service.spec.ts` so lifecycle calls go through `DepositWalletsRepository` and EOA checks go through `WalletsRepository`.

Run: `npm run test --workspace @pmx/api -- deposit-wallet.service.spec.ts`

Expected: FAIL because `DepositWalletService` still injects `PrismaService`.

- [x] **Step 2: Implement `PrismaDepositWalletsRepository` and inject it**

Repository owns Deposit Wallet upsert/update/find operations, wallet operation creation/update, and relayer transaction creation/find.

- [x] **Step 3: Run Deposit Wallet tests**

Run: `npm run test --workspace @pmx/api -- deposit-wallet.service.spec.ts wallets.controller.spec.ts`

Expected: PASS.

## Task 5: Funding Repository

**Files:**
- Create: `apps/api/src/infrastructure/repositories/prisma-funding.repository.ts`
- Modify: `apps/api/src/infrastructure/repositories/repository.types.ts`
- Modify: `apps/api/src/infrastructure/repositories/repositories.module.ts`
- Modify: `apps/api/src/wallets/wallet-funding.service.ts`
- Modify: `apps/api/src/wallets/wallet-funding.service.spec.ts`

- [x] **Step 1: Write failing funding service expectations**

Update `wallet-funding.service.spec.ts` to mock `FundingRepository` reads/writes.

Run: `npm run test --workspace @pmx/api -- wallet-funding.service.spec.ts`

Expected: FAIL because `WalletFundingService` still injects `PrismaService`.

- [x] **Step 2: Implement `PrismaFundingRepository` and inject it**

Repository owns latest Deposit Wallet funding read and balance/allowance cache update.

- [x] **Step 3: Run funding tests**

Run: `npm run test --workspace @pmx/api -- wallet-funding.service.spec.ts`

Expected: PASS.

## Task 6: Audit Logs Repository

**Files:**
- Create: `apps/api/src/infrastructure/repositories/prisma-audit-logs.repository.ts`
- Modify: `apps/api/src/infrastructure/repositories/repository.types.ts`
- Modify: `apps/api/src/infrastructure/repositories/repositories.module.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/auth/auth.module.ts`

- [x] **Step 1: Write failing auth audit expectation**

Update `auth.service.spec.ts` so audit writes expect `AuditLogsRepository.create()` instead of `prisma.auditLog.create()`.

Run: `npm run test --workspace @pmx/api -- auth.service.spec.ts`

Expected: FAIL because `AuthService` still writes Prisma audit logs directly.

- [x] **Step 2: Implement `PrismaAuditLogsRepository` and inject it**

Keep user lookup/creation in `AuthService` for this slice; only audit-log writes move behind the repository.

- [x] **Step 3: Run auth tests**

Run: `npm run test --workspace @pmx/api -- auth.service.spec.ts`

Expected: PASS.

## Task 7: Full Verification

- [x] **Step 1: Run API tests**

Run: `npm run test --workspace @pmx/api`

Expected: PASS, 0 failures.

- [x] **Step 2: Run root tests**

Run: `npm test`

Expected: PASS, 0 failures.

- [x] **Step 3: Run diff whitespace check**

Run: `git diff --check`

Expected: exit 0.

- [x] **Step 4: Review direct Prisma access scope**

Run: `rg -n "PrismaService|prisma\\." apps/api/src/orders apps/api/src/wallets apps/api/src/auth`

Expected: remaining direct Prisma access is limited to `AuthService` user read/write and repository implementation files.

## Next Session Handoff

**Current branch:** `codex/api-repositories`

**Completed module:** API repository layer for Orders, Wallets, Deposit Wallet lifecycle, Funding cache, and Audit Logs.

**Verification evidence:**
- `npm run test --workspace @pmx/api` passed: 23 suites, 98 tests.
- `npm test` passed: API 23 suites / 98 tests, Web 16 files / 58 tests, shared typecheck.
- `git diff --check` passed with Windows CRLF warnings only.

**Remaining direct Prisma access in scoped services:**
- `AuthService` still reads/writes `User` rows directly. This is intentionally out of this slice.
- Orders and wallet services now use repository interfaces for the database access covered by this module.

**Next module:** Full OpenAPI-generated `libs/api-client`.

**Recommended next-session first steps:**
1. Start from this branch after commit or from the PR branch if it has been pushed.
2. Verify the working tree is clean.
3. Read `docs/superpowers/plans/2026-06-29-v2-web-business-flow-layer.md` and this handoff.
4. Create a new plan for OpenAPI client generation without bundling Nx workspace migration.
