# Web Trading Module

## Purpose

Own user-facing order ticket behavior: local amount calculation, preview request, readiness gates, signing action, and paper submit feedback.

## Current Files

| File | Role |
|---|---|
| `apps/web/src/features/trading/order-ticket.tsx` | Ticket UI and amount state |
| `apps/web/src/features/trading/order-preview-client.ts` | Order preview, signing, submit, and list HTTP client |
| `apps/web/src/features/markets/market-detail-page.tsx` | Uses ticket and runs preview -> paper submit flow |

## Rules

- The UI must clearly show preview/paper state.
- It must not pretend a live order was submitted.
- It can simulate signing for paper mode, but the signed payload must be visible and traceable.

## Current State

- `OrderTicket` can show a paper submit section only when the caller provides `onPaperSubmit`.
- Market detail stores the previewed order ID and calls `createSigningIntent`, `saveSignedOrder`, then `submitOrder`.
- The simulated signed payload uses `mode: "paper"` and `paper-signature-<orderId>`.
- Anonymous clients still skip authenticated order requests.
