# Paper Portfolio Module

## Purpose

Show paper trades and positions created from submitted paper orders.

## Scope

In scope:

- Create a paper `Trade` when a signed paper order is submitted.
- Create or update a paper `Position` for the submitted outcome.
- Expose authenticated portfolio summary from the API.
- Show paper positions and recent paper trades on the Web Portfolio page.

Out of scope:

- Real CLOB fills.
- Queue-based reconciliation.
- Position settlement.
- PnL from external market marks.
- Admin write actions.

## Current Files

| File | Role |
|---|---|
| `apps/api/src/orders/orders.service.ts` | Writes paper trade and position after paper submit |
| `apps/api/src/portfolio/portfolio.service.ts` | Reads user positions and trades |
| `apps/api/src/portfolio/portfolio.controller.ts` | `GET /portfolio` endpoint |
| `apps/api/src/portfolio/portfolio.module.ts` | Portfolio module wiring |
| `apps/web/src/features/portfolio/portfolio-client.ts` | Authenticated portfolio API client |
| `apps/web/src/app/portfolio/page.tsx` | Portfolio UI |

## Rules

- Paper submit may write paper trades and positions.
- API must only return the current user's portfolio rows.
- Admin read-only visibility remains in Admin Orders for this module.
- No real CLOB fill or settlement logic is added here.

## Current State

Implemented on 2026-06-30:

- `OrdersService.submitOrder` creates a paper `Trade` and upserts a paper `Position` after paper provider acceptance.
- `GET /portfolio` returns current user positions, recent trades, and summary counts.
- Web `fetchPortfolio` skips anonymous API calls and returns an empty portfolio shape.
- Web Portfolio page renders paper positions and recent paper trades, while preserving empty states.

Targeted verification passed:

```bash
npm test --workspace @pmx/api -- orders portfolio
npm test --workspace @pmx/web -- src/features/portfolio/portfolio-client.test.ts src/app/portfolio/page.test.tsx
```

Full project verification passed on 2026-06-30:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```
