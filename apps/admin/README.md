# PMX Admin

PMX Admin is the operations console for the Polymarket third-party base trading platform.

This app is based on Art Design Pro and keeps its Vue 3, Vite, Element Plus, Pinia, routing, layout, auth, menu, table, and permission architecture. Template demo routes were removed and replaced with PMX-specific modules.

## Scope

- Dashboard: platform status, market sync, CLOB state, manual gates
- Users: registered user and wallet readiness overview
- Markets: Polymarket market sync and listing operations
- Orders: order preview, signed order, CLOB routing, cancel/fill state
- Audit: auth, deposit wallet, order, and risk event log
- Risk: geoblock, rate limit, real-order confirmation, compliance gates

## Local Development

```bash
npm run dev --workspace @pmx/admin
```

The development server runs on port `3001` and proxies API requests to `http://localhost:4000`.

## Build

```bash
npm run build --workspace @pmx/admin
```

## Source Attribution

The admin app is adapted from Art Design Pro under the MIT license. See `LICENSE`.
