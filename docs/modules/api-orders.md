# API Orders Module

## Purpose

Own order preview, signing preparation, signed payload storage, and safe paper submit.

## Current Files

| File | Role |
|---|---|
| `apps/api/src/orders/orders.controller.ts` | HTTP endpoints |
| `apps/api/src/orders/orders.service.ts` | Order business logic |
| `apps/api/src/orders/order-domain.ts` | Pure CLOB draft helpers |
| `apps/api/src/orders/paper-order-provider.ts` | Local paper submit provider |
| `apps/api/src/orders/dto/order-lifecycle.dto.ts` | Signing and submit DTOs |
| `apps/api/src/orders/dto/preview-order.dto.ts` | Preview request DTO |
| `apps/api/src/orders/orders.controller.spec.ts` | Controller routing tests |
| `apps/api/src/orders/orders.service.spec.ts` | Service tests |

## Rules

- API must not store private keys.
- API may store user-provided signed payloads.
- Paper submit must not call Polymarket.
- Live submit requires a separate module and manual approval.

## Current Interfaces

| Endpoint | Status |
|---|---|
| `POST /orders/preview` | Existing preview plus readiness gates |
| `POST /orders/signing-intent` | `PREVIEWED -> SIGNING_REQUESTED` |
| `POST /orders/signed` | `SIGNING_REQUESTED -> SIGNED` |
| `POST /orders/submit` | `SIGNED -> SUBMITTED` in paper mode only |
| `GET /orders` | User list; Admin sees all |
| `GET /orders/:id` | Owner/Admin detail |
