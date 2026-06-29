# Nx Workspace Migration Plan

**Goal:** Introduce Nx workspace tooling while keeping the current app/lib layout and npm workspace behavior.

**Architecture:** Use package-based Nx configuration. Keep `apps/web`, `apps/admin`, `apps/api`, `libs/api-client`, and `packages/shared` in place. Add `nx.json` and per-package `nx` metadata so Nx commands use short project names and existing scripts.

**Out of scope:** Moving directories, `libs/contracts`, `libs/domain`, database schema changes, API contract changes, and business behavior changes.

---

## Acceptance Checklist

- [x] Add a failing workspace boundary test for Nx project metadata.
- [x] Add `nx` as a root dev dependency.
- [x] Add `nx.json` with target defaults and cache inputs.
- [x] Add Nx project metadata for `web`, `admin`, `api`, `api-client`, and `shared`.
- [x] Map `serve` targets for Web/Admin/API.
- [x] Map `api:openapi`.
- [x] Map `api-client:generate` and `api-client:typecheck`.
- [x] Keep npm workspace scripts working.
- [x] Ignore local `.nx/` cache output.
- [x] Keep `libs/contracts` / `libs/domain` migration out of this slice.

## Verification

- [x] `npm run test:nx-workspace`
- [x] `npx nx show projects`
- [x] `npx nx run web:build`
- [x] `npx nx run admin:build`
- [x] `npx nx run api:build`
- [x] `npx nx run api:openapi`
- [x] `npx nx run api-client:generate`
- [x] `npx nx run api-client:typecheck`
- [x] `npx nx graph --file=nx-graph.html` then remove generated graph output
- [x] `npx nx affected -t build test`

## Next Session Handoff

**Current branch:** `main`

**Current module:** Nx workspace migration.

**Important boundaries:**
- Do not move `packages/shared` in this module.
- Do not create `libs/contracts` or `libs/domain` in this module.
- Do not change runtime business behavior as part of Nx setup.
- `.nx/` is local cache output and should stay ignored.

**Recommended next module after completion:** `libs/contracts` / `libs/domain` migration, as a separate module.
