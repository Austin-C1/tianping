# API Client Implementation Plan

**Goal:** Add a full OpenAPI-generated `libs/api-client` package and move Web/Admin low-level API access behind it.

**Architecture:** Keep the current npm workspace layout. Add `libs/api-client` as a workspace package, generate TypeScript schema from Nest Swagger/OpenAPI, and expose a small typed wrapper. Web/Admin keep their existing action/view boundaries and use local adapters for base URL and token storage.

**Out of scope:** Nx workspace migration, `libs/contracts`, `libs/domain`, database schema changes, and Web business flow rewrites.

---

## Acceptance Checklist

- [x] Add API OpenAPI document builder and generation script.
- [x] Add Swagger metadata for current public/authenticated API endpoints used by Web/Admin.
- [x] Generate `apps/api/openapi.json`.
- [x] Add `libs/api-client` workspace package.
- [x] Generate `libs/api-client/src/generated/schema.ts` from OpenAPI.
- [x] Add typed api-client wrapper for auth, markets, orders, wallets, and admin endpoints.
- [x] Move Web low-level clients behind `@pmx/api-client`.
- [x] Add Web boundary test blocking direct feature-client HTTP/path usage.
- [x] Move Admin API modules behind `@pmx/api-client`.
- [x] Add Admin boundary test blocking direct axios/path usage.
- [x] Keep Nx migration and `libs/contracts` / `libs/domain` out of this slice.

## Verification

- [x] `npm run test --workspace @pmx/api -- openapi-document.spec.ts`
- [x] `npm run test --workspace @pmx/api-client`
- [x] `npm run build --workspace @pmx/api-client`
- [x] `npm run test:flow --workspace @pmx/web -- ui-client-boundary.test.ts`
- [x] `npm run test --workspace @pmx/web -- auth-client.test.ts order-preview-client.test.ts wallet-client.test.ts`
- [x] `npm run lint --workspace @pmx/web`
- [x] `npm run test --workspace @pmx/admin -- api-client-boundary.test.ts`
- [x] `npm run build --workspace @pmx/admin`

## Next Session Handoff

**Current branch:** `main`

**Completed module:** Full OpenAPI-generated `libs/api-client`.

**Important boundaries:**
- Regenerate client after API DTO/controller contract changes with `npm run generate --workspace @pmx/api-client`.
- Web/Admin low-level API files should continue using `@pmx/api-client`.
- Nx workspace migration remains a separate future module.
- `libs/contracts` and `libs/domain` migration remain separate future modules.

**Recommended next module:** Choose the next V2 module after api-client; do not continue an old queued `codex/api-client` worktree.
