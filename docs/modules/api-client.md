# Full OpenAPI-generated api-client

## 目标

建立 `@pmx/api-client`，由 Nest OpenAPI 文档生成 TypeScript schema，并提供 Web/Admin 共享的 typed HTTP client。

## 边界

- 包含：API OpenAPI 文档生成、`apps/api/openapi.json`、`libs/api-client/src/generated/schema.ts`、api-client wrapper、Web/Admin low-level client 接入。
- 不包含：Nx workspace migration。
- 不包含：`libs/contracts` 或 `libs/domain` 迁移。
- 不包含：Web flows 的业务编排迁移。

## 接口

- API 生成脚本：`npm run openapi:generate --workspace @pmx/api`
- Client 生成脚本：`npm run generate --workspace @pmx/api-client`
- Client 入口：`@pmx/api-client`
- Web 适配入口：`apps/web/src/features/api/api.ts`
- Admin 适配入口：`apps/admin/src/api/http.ts`

## 验证方式

- API OpenAPI 文档：`npm run test --workspace @pmx/api -- openapi-document.spec.ts`
- Client 行为：`npm run test --workspace @pmx/api-client`
- Web 边界：`npm run test:flow --workspace @pmx/web -- ui-client-boundary.test.ts`
- Admin 边界：`npm run test --workspace @pmx/admin -- api-client-boundary.test.ts`
- 编译检查：`npm run build --workspace @pmx/api-client`、`npm run lint --workspace @pmx/web`、`npm run build --workspace @pmx/admin`

## 当前状态

- API 已增加 Swagger/OpenAPI document builder 和 `openapi:generate` 脚本。
- `libs/api-client` 已加入 npm workspaces。
- Web auth/markets/order/wallet low-level clients 已改为调用 `@pmx/api-client`。
- Admin auth/admin API modules 已改为调用 `@pmx/api-client`。
