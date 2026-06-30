# PMX 2026-06-30 Development Report

## Summary

2026-06-30 completed the PMX paper-trading control loop and Admin risk-readiness chain. The work keeps real CLOB submit disabled while adding the records, audit trail, risk gates, and Admin visibility needed before any future live-trading decision.

## Completed Modules

| Module | Result |
|---|---|
| Orders Paper Loop | Added preview-to-sign-to-paper-submit lifecycle. Paper submit writes local paper order state only. |
| Paper Portfolio | Paper submit now creates paper trades and positions; Web Portfolio reads authenticated paper portfolio data. |
| Audit Risk | Added `AuditLogService`; auth, orders, and portfolio reads write sanitized audit events; Admin `/audit` displays recent records. |
| Risk Gates | Added Admin-only risk gate report and Admin `/risk` page for real-trading blockers. |
| Wallet Funding Readiness | Risk gates now include cached Deposit Wallet pUSD balance and CLOB exchange allowance readiness. |
| Manual Live Approval | Added Admin-only approve/revoke records, audit events, and `/risk` controls without enabling real CLOB submit. |

## Key API Changes

| Area | Change |
|---|---|
| Orders | Added signing intent, signed payload save, paper submit, order list, and order detail APIs. |
| Portfolio | Added authenticated `GET /portfolio`. |
| Audit | Added Admin-only `GET /admin/audit`. |
| Risk | Added Admin-only `GET /admin/risk/gates`. |
| Manual Approval | Added `GET /admin/live-approval`, `POST /admin/live-approval/approve`, and `POST /admin/live-approval/revoke`. |

## Database Changes

| Migration | Purpose |
|---|---|
| `20260630190000_add_order_paper_lifecycle_statuses` | Adds order lifecycle statuses for signing and paper submit flow. |
| `20260630203000_add_live_trading_approval` | Adds `LiveTradingApproval` records with active-approval uniqueness guard. |

## Admin And Web Changes

| Surface | Change |
|---|---|
| Admin Orders | Added read-only operational order table. |
| Admin Audit | Added read-only audit log table. |
| Admin Risk | Added risk gate dashboard, funding readiness, and manual approval controls. |
| Web Trading | Market detail can move an order through preview, simulated signing, and paper submit. |
| Web Portfolio | Added paper positions and recent paper trades. |

## Safety Boundary

- Real CLOB submit is still not implemented or enabled.
- `ORDER_ROUTER_MODE=live` remains blocked by the `order-router-safe-mode` risk gate.
- Manual live approval records operator intent only; it does not open live order routing.
- No private keys, mnemonics, signing secrets, or user funds are stored or mutated by these modules.
- Admin risk pages do not refresh on-chain balances or trigger external CLOB calls.

## Verification

Passed on 2026-06-30:

```bash
npm run db:migrate
npm run prisma:generate
npm test
npm run build
npm run lint
npm run test:e2e
```

Targeted checks also passed during module work:

```bash
npm test --workspace @pmx/api -- admin
npm run build --workspace @pmx/admin
npm run test:e2e -- tests/e2e/admin.spec.ts
```

## Dependency Audit Follow-up

`npm audit fix` was run on 2026-06-30 after the PR conflict cleanup. It safely updated the lockfile for:

| Package | Change |
|---|---|
| `@nestjs/swagger` | `11.4.4` -> `11.4.5` |
| `@nestjs/swagger` nested `js-yaml` | `4.1.1` -> `4.3.0` |
| `@istanbuljs/load-nyc-config` nested `js-yaml` | `3.14.2` -> `3.15.0` |
| `swagger-ui-dist` | `5.32.6` -> `5.32.8` |
| `viem` | `2.53.1` -> `2.54.0` |

Remaining `npm audit` items are still reported by upstream dependency chains:

| Source | Reason not force-fixed |
|---|---|
| `@polymarket/builder-relayer-client` / `@polymarket/clob-client-v2` | Pull in old `axios`, `ethers@5`, `viem`, and `ws` chains. Replacing or downgrading these SDKs would affect CLOB integration contracts. |
| `@nestjs/platform-express` | Uses `multer@2.1.1`; npm's force suggestion downgrades Nest core to `7.5.5`, which is a breaking framework rollback. |
| `next` | Uses `postcss@8.4.31`; npm's force suggestion downgrades Next to `9.3.3`, which is not compatible with the current app. |
| `vite` | Uses `esbuild@0.27.7`; npm reports a normal fix path, but workspace `npm audit fix` did not produce a compatible dependency-tree update. |

`npm audit fix --force` was intentionally not used because the proposed fixes are framework downgrades or Polymarket SDK contract changes. Real CLOB submit remains disabled, so the Polymarket SDK risk is not currently exposed through live order submission.

## Main Files

| Path | Purpose |
|---|---|
| `docs/project-memory.md` | Project memory and verified commands. |
| `docs/module-index.md` | Cross-module status and development boundaries. |
| `docs/modules/` | Independent module documents. |
| `docs/superpowers/plans/2026-06-30-*.md` | Module implementation plans. |
| `apps/api/prisma/schema.prisma` | Data model updates. |
| `apps/api/src/admin` | Admin risk, audit, and manual approval APIs. |
| `apps/api/src/orders` | Paper order lifecycle and paper submit behavior. |
| `apps/api/src/portfolio` | Paper portfolio API. |
| `apps/admin/src/views` | Admin Orders, Audit, and Risk pages. |
| `apps/web/src/features` | Web trading and portfolio UI changes. |
| `tests/e2e/admin.spec.ts` | Admin browser verification. |
