# Admin Orders Module

## Purpose

Give operators visibility into order previews, signed payloads, paper submissions, status, and failure reasons.

## Current Files

| File | Role |
|---|---|
| `apps/admin/src/router/index.ts` | Admin route registration |
| `apps/admin/src/api/admin.ts` | Admin HTTP client |
| `apps/admin/src/views/OrdersView.vue` | Read-only order list and status summary |

## Rules

- Admin can view order status and failure reasons.
- Admin must not sign user orders.
- Admin must not submit live CLOB orders in this module.

## Current State

- `/orders` route uses `OrdersView`.
- The page reads `GET /orders` with the admin token.
- The table shows market, outcome, status, price, size, paper/CLOB ID, failure reason, submitted time, and updated time.
- Admin build verification passed with `npm run build --workspace @pmx/admin`.
