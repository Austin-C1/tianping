# Contracts Migration Plan

**Goal:** Move stable cross-package contracts into `libs/contracts` while preserving the existing `@pmx/shared` entrypoint as a compatibility layer.

**Architecture:** Add a package-based workspace project named `contracts`. Keep `packages/shared` in place and make it re-export contract values from `@pmx/contracts`.

**Out of scope:** `libs/domain`, API DTO/OpenAPI/api-client generation changes, runtime business behavior changes, and directory moves outside the new contracts package.

---

## Acceptance Checklist

- [x] Add a failing workspace boundary test for `contracts` Nx metadata.
- [x] Add `libs/contracts` package with `@pmx/contracts` entrypoint.
- [x] Move shared contract constants/types into `@pmx/contracts`.
- [x] Keep `@pmx/shared` as a compatibility re-export layer.
- [x] Update root build order and package lock.
- [x] Keep `libs/domain` out of this module.

## Verification

- [x] `npm run test:nx-workspace`
- [x] `npx nx show projects`
- [x] `npx nx run contracts:build`
- [x] `npm run test --workspace @pmx/contracts`
- [x] `npx nx run shared:build`
- [x] `npm run test --workspace @pmx/shared`
- [x] `npm test`
- [x] `npm run build`
- [x] `git diff --check`

## Next Session Handoff

**Current branch:** `main`

**Current module:** Contracts migration completed.

**Important boundaries:**
- Do not create or migrate `libs/domain` in this module.
- Do not change API DTO/OpenAPI/api-client generation in this module.
- Keep `@pmx/shared` available until downstream references are intentionally migrated.

**Recommended next module after completion:** `libs/domain` migration.
