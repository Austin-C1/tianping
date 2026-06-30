# PMX Project Memory

## Project Goal

PMX is a non-custodial Polymarket trading workspace. The current product direction is a verifiable trading-preparation chain: auth, market browsing, wallet proof, Deposit Wallet readiness, funding readiness, order preview, signed payload capture, paper submit, then guarded live CLOB only after explicit future approval and implementation.

Real CLOB submit is still not implemented and must stay disabled.

## Current Baseline

- Web, Admin, API, PostgreSQL, and Redis run locally.
- Useful local URLs:
  - Web: `http://127.0.0.1:3000`
  - Admin: `http://127.0.0.1:3001/#/login`
  - API health: `http://127.0.0.1:4000/health`
- Default local admin:
  - Email: `admin@pmx.local`
  - Password: `change-me-123`
- `origin/main` now includes:
  - Nx workspace targets and project metadata.
  - `libs/contracts` for shared contracts, with `@pmx/shared` kept as compatibility forwarding.
  - `libs/domain` for pure order-domain logic.
  - `libs/api-client` for generated/typed HTTP access.
  - API repository boundaries under `apps/api/src/infrastructure/repositories`.
  - Web actions and flow boundaries under `apps/web/src/flows` and feature `*-actions.ts`.
- The 2026-06-30 conflict resolution keeps those `origin/main` boundaries and integrates the paper order loop, audit/risk, funding gate, and manual live approval work into them.

## Development Rules

- Develop one module at a time.
- Each module keeps its own memory document under `docs/modules/`.
- Cross-module status is summarized in `docs/module-index.md`.
- Module memory records stable facts, boundaries, interfaces, verification commands, and current state.
- Do not mix temporary chat notes into project memory.
- Do not enable real CLOB submit without explicit future module scope and user confirmation.
- Do not store user private keys, mnemonics, signing secrets, or raw secret-like payload keys.

## Active Module State

Current completed module: `manual-live-approval`.

Recent completed modules:

- `orders-paper-loop`
- `paper-portfolio`
- `audit-log`
- `risk-gates`
- `wallet-funding-readiness`
- `manual-live-approval`
- `api-client`
- `api-repositories`
- `v2-web-business-flow-layer`
- `contracts`
- `domain`
- `nx-workspace`

## Stable Implementation Facts

- Orders preview creates a CLOB V2 draft and persists a `PREVIEWED` order. Submit remains disabled in preview output.
- Paper order lifecycle is:

```text
PREVIEWED -> SIGNING_REQUESTED -> SIGNED -> SUBMITTED
```

- `ORDER_ROUTER_MODE=preview` blocks submit.
- `ORDER_ROUTER_MODE=paper` can call the local paper provider and creates local paper order IDs.
- `ORDER_ROUTER_MODE=live` still rejects submit because live CLOB submit is not implemented in this module.
- Paper submit writes a `Trade` row and upserts a `Position` row.
- Portfolio reads only existing paper trade/position data.
- Auth register/login, order preview/signing/signed/submit, portfolio reads, and live approval mutations write audit records.
- Audit metadata removes private-key, mnemonic, seed, and secret-style fields before persistence.
- Admin audit is read-only.
- Admin risk gates aggregate Order Router mode, market sync, quote sync, wallet binding, Deposit Wallet readiness, funding readiness, audit trail, rate-limit events, and manual live approval.
- Funding readiness uses existing cached `DepositWallet` fields: `pUsdBalance`, `exchangeAllowance`, and `balanceAllowanceUpdatedAt`.
- Manual live approval stores Admin approval/revoke state, reasons, operators, and timestamps in `LiveTradingApproval`.
- Manual live approval writes `live_approval.approved` and `live_approval.revoked` audit actions.
- Manual live approval changes the `manual-live-approval` risk gate only. It does not enable real CLOB submit, change order submit behavior, or move user funds.
- Web/Admin low-level API access should go through `@pmx/api-client`.
- Web UI components should call actions/flows rather than feature `*-client` modules directly.
- API services should prefer repository interfaces under `apps/api/src/infrastructure/repositories` instead of direct Prisma access when a repository contract exists.

## Verified Commands

Common local setup and verification commands:

```bash
docker compose up -d
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm test
npm run build
npm run lint
npm run test:e2e
```

Useful targeted verification:

```bash
npm test --workspace @pmx/api -- auth
npm test --workspace @pmx/api -- orders
npm test --workspace @pmx/api -- admin
npm test --workspace @pmx/api -- openapi-document.spec.ts
npm test --workspace @pmx/web -- order
npm run test:flow --workspace @pmx/web -- ui-client-boundary.test.ts
npm run test --workspace @pmx/admin -- api-client-boundary.test.ts
npm run build --workspace @pmx/admin
npm run test --workspace @pmx/api-client
```

Before the PR conflict resolution on 2026-06-30, the manual live approval implementation passed:

```bash
npm run db:migrate
npm run prisma:generate
npm test
npm run build
npm run lint
npm run test:e2e
```

After merging `origin/main` into the feature branch on 2026-06-30, conflict resolution verification passed:

```bash
npm run generate --workspace @pmx/api-client
npm test
npm run build
npm run lint
npm run test:e2e
```
