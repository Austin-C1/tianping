# V2 Web Business Flow Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Web Business Flow Layer so AI and tests can call complete business flows without Playwright selectors.

**Architecture:** Keep the current `apps/web/src/features/*` layout for this batch. Add `*.actions.ts` files beside existing clients, then add `apps/web/src/flows/*` files that orchestrate actions. Add a minimal backend `MarketProvider` adapter for market sync without changing database schema.

**Tech Stack:** Next.js, React, TypeScript, Vitest, NestJS, Jest, existing Web/API clients.

---

## Acceptance Checklist

- [x] Add `npm run test:flows` entry point.
- [x] Add auth actions and `register-login` flow scenario.
- [x] Add market/trade actions and `trade-preview` flow scenario.
- [x] Add wallet/funding actions and blocked/ready readiness scenarios.
- [x] Add UI boundary test so React UI imports actions/flows instead of low-level `*-client` files.
- [x] Split wallet action boundaries into readiness, signing, Deposit Wallet, and Funding action files.
- [x] Add a minimal API `MarketProvider` interface and Polymarket provider wrapper.
- [x] Move `MarketsService` to depend on `MARKET_PROVIDER` instead of `PolymarketClient`.
- [x] Verify `npm run test:flows`.
- [x] Verify `npm run test --workspace @pmx/web`.
- [x] Verify `npm run lint --workspace @pmx/web`.
- [x] Verify `npm run test --workspace @pmx/api`.
- [x] Verify `npm test`.

## Deferred V2 Work

The remaining V2 work should be split into separate branches:

- Database repositories for orders, wallets, deposit wallets, balances, funding, and audit logs.
- Full OpenAPI-generated `libs/api-client`.
- Nx workspace migration.
- `libs/contracts` and `libs/domain` migration.

Those changes affect project layout and build tooling, so they should not be bundled into this Web flow/provider slice.
