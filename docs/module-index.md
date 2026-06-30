# PMX Module Index

| Module | Path | Status | Can Develop Alone | Verification |
|---|---|---|---|---|
| Nx Workspace | `nx.json`, package metadata, workspace targets | Implemented | Yes, if limited to tooling/project metadata | `npm run test:nx-workspace`; `npx nx show projects`; `npx nx affected -t build test` |
| Contracts | `libs/contracts`, `packages/shared` compatibility exports | Implemented | Yes, if limited to shared contracts | `npm run build --workspace @pmx/contracts`; `npm run test --workspace @pmx/contracts` |
| Domain | `libs/domain` | Implemented for pure order-domain logic | Yes, if limited to pure domain logic | `npm run build --workspace @pmx/domain`; `npm run test --workspace @pmx/domain` |
| API Client | `libs/api-client`, API OpenAPI generation | Implemented; extended for order lifecycle, Admin risk/approval, and queue sync endpoints | Strongly tied to API controller/DTO response shape | `npm run openapi:generate --workspace @pmx/api`; `npm run test --workspace @pmx/api-client` |
| API Repository Boundaries | `apps/api/src/infrastructure/repositories` | Implemented; Orders lifecycle now uses repository boundary | Mostly; service changes should update repository contracts together | `npm test --workspace @pmx/api -- repositories orders` |
| V2 Web Business Flow Layer | `apps/web/src/flows`, `apps/web/src/features/*-actions.ts` | Implemented; paper order flow added through trading actions/flows | Yes after feature clients are stable | `npm run test:flow --workspace @pmx/web -- ui-client-boundary.test.ts` |
| Auth | `apps/api/src/auth`, `apps/web/src/features/auth`, `apps/admin/src/stores/auth` | Working baseline; audit writes use repository boundary | Yes | `npm test --workspace @pmx/api -- auth`; `npm test --workspace @pmx/web -- auth` |
| Markets | `apps/api/src/markets`, `apps/web/src/features/markets`, Admin market status view | Working baseline | Mostly | `npm test --workspace @pmx/api -- markets`; `npm test --workspace @pmx/web -- markets`; `npm run test:e2e` |
| Wallets | `apps/api/src/wallets`, `apps/web/src/features/wallet`, Admin risk funding gate | Funding readiness implemented from cached Deposit Wallet balance/allowance | Mostly | `npm test --workspace @pmx/api -- wallets admin`; `npm test --workspace @pmx/web -- wallet`; `npm run test:e2e` |
| Orders Preview | `apps/api/src/orders`, `apps/web/src/features/trading` | Working baseline through API client and web flow layer | Strongly tied to Markets and Wallets | `npm test --workspace @pmx/api -- orders.service.spec.ts`; `npm test --workspace @pmx/web -- order` |
| Orders Paper Loop | `apps/api/src/orders`, `apps/web/src/features/trading`, `apps/web/src/features/markets`, `apps/admin/src/views` | Implemented; repository/API-client aligned | Tied to Orders Preview, Wallets, Admin, API Client | `npm test`; `npm run build`; `npm run lint`; `npm run test:e2e` |
| Paper Portfolio | `apps/api/src/portfolio`, `apps/api/src/orders`, `apps/web/src/features/portfolio`, `apps/web/src/app/portfolio` | Implemented and verified before merge conflict resolution | Tied to Orders Paper Loop | `npm test`; `npm run build`; `npm run lint`; `npm run test:e2e` |
| Admin Operations | `apps/admin/src/views`, `apps/admin/src/api`, `libs/api-client` | Audit, Orders, Risk, live approval and queued Markets sync views implemented; Settings still partial | Yes after API-client methods exist | `npm run build --workspace @pmx/admin`; `npm run test:e2e` |
| Compliance/Risk | `apps/api/src/compliance`, `apps/api/src/admin`, `apps/admin/src/views/AuditView.vue`, `apps/admin/src/views/RiskView.vue` | Audit trail, risk gate report, funding gate, manual approval, and queue sync readiness gate implemented | Audit trail can develop alone after action contracts; risk gates depend on Wallets/Orders/SyncJobRun data | `npm test --workspace @pmx/api -- audit-log auth orders portfolio admin jobs`; `npm run build --workspace @pmx/admin`; `npm run test:e2e` |
| Manual Live Approval | `apps/api/src/admin`, `apps/api/prisma`, `apps/admin/src/views/RiskView.vue`, `libs/api-client` | Implemented; records Admin approval/revoke state and audit logs without enabling real CLOB submit | Mostly; depends on `risk-gates`, `audit-log`, and Admin API client contracts | `npm test --workspace @pmx/api -- admin`; `npm run build --workspace @pmx/admin`; `npm run test:e2e -- tests/e2e/admin.spec.ts` |
| Queue Sync | `apps/api/src/jobs`, `apps/api/prisma`, `apps/admin/src/views/PlaceholderView.vue`, `libs/api-client` | Implemented as `queue-sync-readiness`; first scope is queued market/quote sync visibility, not live reconciliation | Market sync readiness can develop alone; live order/trade/position sync must be separate | `npm test --workspace @pmx/api -- jobs admin openapi`; `npm run test --workspace @pmx/api-client`; `npm run build --workspace @pmx/admin`; `npm run test:e2e -- tests/e2e/admin.spec.ts` |

## Strong Bindings

- API controller/DTO response shape changes must be reflected in `libs/api-client`.
- Web/Admin low-level API modules must call `@pmx/api-client`; UI components should use actions or flows, not feature clients directly.
- Orders Paper Loop depends on Markets quote/token data, Wallet readiness, Order Router mode, Admin visibility, API-client methods, and Orders repository contracts.
- Paper Portfolio depends on paper order submit and should stay paper-only until real CLOB fill sync exists.
- Audit trail depends on Auth, Orders, and Portfolio action points, but Admin display is read-only.
- Risk gates read manual live approval state, but real CLOB submit remains blocked unless the explicit router/live implementation is added in a future module.
- Manual Live Approval depends on AuditLog and Admin Risk, records approval readiness only, and must not modify order submit behavior or user funds.
- Wallet funding readiness uses cached Deposit Wallet pUSD/allowance data and must not trigger chain refresh from Admin risk pages.
- Queue Sync readiness starts with queued market/quote sync status. Live order, trade, and position reconciliation remain out of scope until a separate live-sync module is approved.
