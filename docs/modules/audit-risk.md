# Audit Risk Module

## Purpose

Record key product actions in `AuditLog` and expose them to Admin as a read-only audit trail.

## Scope

In scope:

- Central `AuditLogService` for writing structured audit rows.
- Auth audit events for register and login.
- Order audit events for preview, signing intent, signed payload, and submit.
- Portfolio audit event for portfolio reads.
- Admin API endpoint for latest audit logs.
- Admin `/audit` page with read-only audit log table.

Out of scope:

- Rate limiting.
- Geo-blocking.
- Live CLOB approval.
- Audit export.
- Editing or deleting audit logs.

## Acceptance Criteria

| Area | Standard |
|---|---|
| API write | Auth, order lifecycle, and portfolio reads write `AuditLog` rows with `userId`, `action`, and structured `metadata`. |
| API read | Only Admin can read latest audit logs through the Admin API. Regular users receive `403`. |
| Admin UI | `/audit` shows action, user email, time, and metadata summary in a read-only table. |
| Safety | Audit module must not store private keys, mnemonics, or signed secret material. |
| Scope | No real CLOB submit, rate limit, geoblock, export, or destructive audit operation is added. |
| Verification | Targeted API tests, Admin build, full `npm test`, `npm run build`, `npm run lint`, and `npm run test:e2e` pass. |

## Current Files

| File | Role |
|---|---|
| `apps/api/src/compliance/audit-log.service.ts` | Central audit write helper and metadata sanitizer |
| `apps/api/src/admin/admin.service.ts` | Admin-only audit list API logic |
| `apps/api/src/admin/admin.controller.ts` | `GET /admin/audit` route |
| `apps/api/src/auth/auth.service.ts` | Auth action audit events |
| `apps/api/src/orders/orders.service.ts` | Order lifecycle audit events |
| `apps/api/src/portfolio/portfolio.service.ts` | Portfolio read audit event |
| `apps/admin/src/views/AuditView.vue` | Admin audit table |
| `apps/admin/src/api/admin.ts` | Admin audit client |

## Current State

- `AuditLogService.record()` writes structured `AuditLog` rows through Prisma.
- Metadata sanitizer removes private-key, mnemonic, seed, and secret-style fields recursively.
- Implemented audit actions:
  - `auth.register`
  - `auth.login`
  - `order.previewed`
  - `order.signing_requested`
  - `order.signed`
  - `order.submitted`
  - `portfolio.read`
- Admin `GET /admin/audit` returns the latest 100 logs ordered by newest first.
- Admin `/audit` is read-only and displays action, user email/user id, metadata summary, and created time.

## Verification

Targeted verification passed on 2026-06-30:

```bash
npm test --workspace @pmx/api -- audit-log auth orders portfolio admin
npm run build --workspace @pmx/admin
```

Full project verification passed on 2026-06-30:

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```
