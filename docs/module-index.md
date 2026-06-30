# PMX Module Index

| Module | Path | Status | Can Develop Alone | Verification |
|---|---|---|---|---|
| Auth | `apps/api/src/auth`, `apps/web/src/features/auth`, `apps/admin/src/stores/auth` | Working baseline | Yes | `npm test --workspace @pmx/api -- auth`; `npm test --workspace @pmx/web -- auth` |
| Markets | `apps/api/src/markets`, `apps/web/src/features/markets`, Admin Markets status view | Working baseline | Mostly | `npm test --workspace @pmx/api -- markets`; `npm test --workspace @pmx/web -- markets`; `npm run test:e2e` |
| Wallets | `apps/api/src/wallets`, `apps/web/src/features/wallet`, Admin Risk funding gate | Funding readiness implemented from cached Deposit Wallet balance/allowance | Mostly | `npm test --workspace @pmx/api -- wallets admin`; `npm test --workspace @pmx/web -- wallet`; `npm run test:e2e` |
| Orders Preview | `apps/api/src/orders`, `apps/web/src/features/trading` | Working baseline | Strongly tied to Markets and Wallets | `npm test --workspace @pmx/api -- orders.service.spec.ts`; `npm test --workspace @pmx/web -- order` |
| Orders Paper Loop | `apps/api/src/orders`, `apps/web/src/features/trading`, `apps/web/src/features/markets`, `apps/admin/src/views` | Implemented and verified | Tied to Orders Preview, Wallets, Admin | `npm test`; `npm run build`; `npm run lint`; `npm run test:e2e` |
| Paper Portfolio | `apps/api/src/portfolio`, `apps/api/src/orders`, `apps/web/src/features/portfolio`, `apps/web/src/app/portfolio` | Implemented and verified | Tied to Orders Paper Loop | `npm test`; `npm run build`; `npm run lint`; `npm run test:e2e` |
| Admin Operations | `apps/admin/src/views`, `apps/admin/src/api` | Audit, Orders, and Risk views implemented; Markets/Settings still partial | Yes after API endpoints exist | `npm run build --workspace @pmx/admin`; `npm run test:e2e` |
| Compliance/Risk | `apps/api/src/compliance`, `apps/api/src/admin`, `apps/admin/src/views/AuditView.vue`, `apps/admin/src/views/RiskView.vue` | Audit trail, risk gate report, funding gate, and manual approval workflow implemented | Audit trail can develop alone after Orders/Portfolio contracts; risk gates depend on Wallets/Orders data | `npm test --workspace @pmx/api -- audit-log auth orders portfolio admin`; `npm run build --workspace @pmx/admin`; `npm run test:e2e` |
| Manual Live Approval | `apps/api/src/admin`, `apps/api/prisma`, `apps/admin/src/views/RiskView.vue` | Implemented; records Admin approval/revoke state and audit logs without enabling real CLOB submit | Mostly; depends on `risk-gates` and `audit-log` contracts | `npm test --workspace @pmx/api -- admin`; `npm run build --workspace @pmx/admin`; `npm run test:e2e -- tests/e2e/admin.spec.ts` |
| Queue Sync | `apps/api/src/jobs` | Queue names only | No, depends on paper/live lifecycle | Not ready |

## Strong Bindings

- Orders Paper Loop depends on:
  - Markets for valid quote/token data.
  - Wallet readiness for signing gates.
  - Order Router config for mode checks.
  - Admin API for operational visibility.
- Admin Orders is read-only and can be developed separately after the `/orders` list contract is stable.
- Paper Portfolio depends on paper order submit and should stay paper-only until real CLOB fill sync exists.
- Queue Sync should wait until paper order states exist.
- Audit trail depends on Auth, Orders, and Portfolio action points, but Admin display is read-only.
- Risk gates now read manual live approval state, but real CLOB submit remains blocked by `order-router-safe-mode` when `ORDER_ROUTER_MODE=live`.
- Manual Live Approval depends on AuditLog and Admin Risk, records approval readiness only, and must not modify order submit behavior or user funds.
- Wallet funding readiness uses cached Deposit Wallet pUSD/allowance data and must not trigger chain refresh from Admin risk pages.
