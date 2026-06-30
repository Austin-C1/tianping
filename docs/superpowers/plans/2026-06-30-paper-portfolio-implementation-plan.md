# Paper Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Submitted paper orders create paper trades and positions, and the Web Portfolio page shows them.

**Architecture:** Reuse existing Prisma `Trade` and `Position` tables. Orders remain responsible for creating paper fills at submit time; a new Portfolio API module exposes read-only authenticated portfolio data to the Web app.

**Tech Stack:** NestJS, Prisma, Jest, Next.js, React, Vitest, Playwright.

---

### Task 1: API Paper Fill Write

**Files:**
- Modify: `apps/api/src/orders/orders.service.spec.ts`
- Modify: `apps/api/src/orders/orders.service.ts`

- [ ] **Step 1: Write failing service test**

Add a test proving `submitOrder` creates a paper trade and position for the signed order owner.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @pmx/api -- orders`

Expected: fail because `trade.create` and `position.upsert` are not called.

- [ ] **Step 3: Implement minimal paper fill write**

Extend the signed order lookup to include `userId`, `marketSnapshotId`, `outcome`, `side`, `price`, and `size`. After paper provider submit succeeds, create a `Trade` and upsert a `Position`.

- [ ] **Step 4: Run API order tests**

Run: `npm test --workspace @pmx/api -- orders`

Expected: all order tests pass.

### Task 2: Portfolio API

**Files:**
- Create: `apps/api/src/portfolio/portfolio.service.spec.ts`
- Create: `apps/api/src/portfolio/portfolio.service.ts`
- Create: `apps/api/src/portfolio/portfolio.controller.spec.ts`
- Create: `apps/api/src/portfolio/portfolio.controller.ts`
- Create: `apps/api/src/portfolio/portfolio.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write failing service and controller tests**

Tests must prove the service filters by `userId`, returns positions, returns trades, and the controller routes `GET /portfolio` to the service with the authenticated user.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @pmx/api -- portfolio`

Expected: fail because the module files do not exist.

- [ ] **Step 3: Implement Portfolio module**

Create read-only service, controller, and module. Import it from `AppModule`.

- [ ] **Step 4: Run portfolio tests**

Run: `npm test --workspace @pmx/api -- portfolio`

Expected: portfolio tests pass.

### Task 3: Web Portfolio Client

**Files:**
- Create: `apps/web/src/features/portfolio/portfolio-client.test.ts`
- Create: `apps/web/src/features/portfolio/portfolio-client.ts`

- [ ] **Step 1: Write failing client tests**

Tests must prove authenticated requests call `/portfolio` and anonymous users receive an empty portfolio without fetch.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @pmx/web -- src/features/portfolio/portfolio-client.test.ts`

Expected: fail because the client does not exist.

- [ ] **Step 3: Implement minimal client**

Use the existing Web auth token helper and return a stable empty shape for anonymous users.

- [ ] **Step 4: Run client tests**

Run: `npm test --workspace @pmx/web -- src/features/portfolio/portfolio-client.test.ts`

Expected: client tests pass.

### Task 4: Web Portfolio Page

**Files:**
- Create: `apps/web/src/app/portfolio/page.test.tsx`
- Modify: `apps/web/src/app/portfolio/page.tsx`

- [ ] **Step 1: Write failing page tests**

Tests must prove positions and recent trades render when the portfolio client returns rows, and the existing empty state remains for anonymous/empty data.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @pmx/web -- src/app/portfolio/page.test.tsx`

Expected: fail because the page is static.

- [ ] **Step 3: Implement page loading and rendering**

Load portfolio data on mount, show position rows and recent trade rows, keep clear empty states.

- [ ] **Step 4: Run page tests**

Run: `npm test --workspace @pmx/web -- src/app/portfolio/page.test.tsx`

Expected: page tests pass.

### Task 5: Docs and Full Verification

**Files:**
- Modify: `docs/project-memory.md`
- Modify: `docs/module-index.md`
- Modify: `docs/modules/paper-portfolio.md`

- [ ] **Step 1: Update docs**

Record implementation status, boundaries, and verification commands.

- [ ] **Step 2: Run targeted verification**

Run:

```bash
npm test --workspace @pmx/api -- orders
npm test --workspace @pmx/api -- portfolio
npm test --workspace @pmx/web -- src/features/portfolio/portfolio-client.test.ts src/app/portfolio/page.test.tsx
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```
