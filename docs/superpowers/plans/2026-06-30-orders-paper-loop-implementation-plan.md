# Orders Paper Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for each behavior. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe paper order lifecycle from preview to signed payload to paper-submitted order.

**Architecture:** Extend the existing NestJS orders module first, then expose the flow in Web and Admin. Paper submit uses a local provider and never calls Polymarket. Live CLOB is explicitly out of scope.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, Next.js, Vue 3, Ant Design Vue, Jest, Vitest, Playwright.

---

## Task 1: API Order Lifecycle

- [ ] Add failing service tests for signing intent, signed payload persistence, preview-mode submit rejection, paper-mode submit success, list, and detail.
- [ ] Implement minimal DTOs and service methods.
- [ ] Add controller endpoints and controller tests.
- [ ] Verify `npm test --workspace @pmx/api -- orders`.

## Task 2: Web Paper Ticket

- [ ] Add failing client tests for `createSigningIntent`, `saveSignedOrder`, `submitPaperOrder`, and `listOrders`.
- [ ] Extend the order client and ticket UI.
- [ ] Verify `npm test --workspace @pmx/web -- order`.

## Task 3: Admin Orders Page

- [ ] Add Admin order API types and fetch function.
- [ ] Replace Orders placeholder with an `OrdersView.vue`.
- [ ] Verify `npm run build --workspace @pmx/admin`.

## Task 4: End-to-End Verification

- [ ] Add/extend E2E for preview to paper submitted.
- [ ] Run `npm test`, `npm run build`, `npm run lint`, and `npm run test:e2e`.
