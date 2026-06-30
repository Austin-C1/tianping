# Orders Paper Loop Module

## Goal

Create a safe paper order lifecycle before any live CLOB submit:

```text
PREVIEWED -> SIGNING_REQUESTED -> SIGNED -> SUBMITTED
```

## Scope

In scope:

- `POST /orders/signing-intent`
- `POST /orders/signed`
- `POST /orders/submit`
- `GET /orders`
- `GET /orders/:id`
- Paper provider that never calls Polymarket.
- Admin Orders view with status and failure reason.
- Web order ticket flow for preview, signing simulation, and paper submit.

Out of scope:

- Live CLOB submit.
- Real wallet CLOB order signing.
- Real fills.
- Cancellation.
- Trade and Position reconciliation.
- Region/risk final approval.

## API Boundaries

| Endpoint | Purpose |
|---|---|
| `POST /orders/preview` | Existing preview and readiness gates |
| `POST /orders/signing-intent` | Convert a previewed order into a signing request |
| `POST /orders/signed` | Persist user signed payload only |
| `POST /orders/submit` | Submit signed order to paper provider only |
| `GET /orders` | Return current user's orders; Admin role returns all orders |
| `GET /orders/:id` | Return one order visible to owner or admin |

## Status Rules

- `PREVIEWED` can become `SIGNING_REQUESTED`.
- `SIGNING_REQUESTED` can become `SIGNED`.
- `SIGNED` can become `SUBMITTED`.
- `POST /orders/submit` must reject when `ORDER_ROUTER_MODE=preview`.
- `POST /orders/submit` must use paper provider when `ORDER_ROUTER_MODE=paper`.
- `ORDER_ROUTER_MODE=live` remains out of scope for submit in this module.

## Verification

Required before module completion:

```bash
npm test --workspace @pmx/api -- orders
npm test --workspace @pmx/web -- order
npm run build
npm run test:e2e
```

## Current State

Implemented on 2026-06-30:

- Prisma `OrderStatus` supports `SIGNING_REQUESTED` and `SUBMITTING`.
- API supports preview, signing intent, signed payload storage, paper submit, list, and detail.
- Signed payload storage sanitizes obvious private key and mnemonic fields before persistence.
- `ORDER_ROUTER_MODE=preview` blocks submit; `paper` submits to a local paper provider; `live` is explicitly rejected in this module.
- Web market detail simulates paper signing and shows submit status in the ticket.
- Admin Orders page lists market, outcome, status, price, size, paper/CLOB ID, failure reason, and timestamps.

Targeted verification passed:

```bash
npm test --workspace @pmx/api -- orders
npm test --workspace @pmx/web -- src/features/trading/order-preview-client.test.ts
npm test --workspace @pmx/web -- src/features/trading/order-ticket.test.tsx
npm test --workspace @pmx/web -- src/features/markets/market-detail-page.test.tsx
npm run build --workspace @pmx/admin
```

Full project verification passed on 2026-06-30:

```bash
npm run db:migrate
npm run prisma:generate
npm test
npm run build
npm run lint
npm run test:e2e
```
