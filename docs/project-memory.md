# 项目记忆

## 项目状态

- 当前主线以 `main` / `origin/main` 为准，不继续使用旧功能分支。
- V2 Web Business Flow Layer 已完成。
- API repository boundaries 已完成。
- Full OpenAPI-generated `libs/api-client` 已完成。
- Nx workspace migration 已完成。
- Contracts migration 已完成。
- Domain migration 已完成。
- 当前模块：等待下一阶段规划。

## 已验证的运行方式

- 生成 Prisma Client：`npm run prisma:generate`
- 生成 OpenAPI 与 api-client schema：`npm run generate --workspace @pmx/api-client`
- API OpenAPI 文档单测：`npm run test --workspace @pmx/api -- openapi-document.spec.ts`
- api-client 单测：`npm run test --workspace @pmx/api-client`
- Web flow 边界测试：`npm run test:flow --workspace @pmx/web -- ui-client-boundary.test.ts`
- Admin API 边界测试：`npm run test --workspace @pmx/admin -- api-client-boundary.test.ts`
- Nx 项目识别：`npx nx show projects`
- Nx build targets：`npx nx run web:build`、`npx nx run admin:build`、`npx nx run api:build`
- Nx OpenAPI/client targets：`npx nx run api:openapi`、`npx nx run api-client:generate`、`npx nx run api-client:typecheck`
- Nx affected 验证：`npx nx affected -t build test`
- Contracts build/test：`npm run build --workspace @pmx/contracts`、`npm run test --workspace @pmx/contracts`
- Domain build/test：`npm run build --workspace @pmx/domain`、`npm run test --workspace @pmx/domain`

## 开发边界

- `libs/api-client` 只负责 OpenAPI 生成类型、HTTP 调用封装、base URL 和 Bearer header 处理。
- Web module actions 和 flows 仍是业务流程边界；不要把业务编排放进 api-client。
- Nx workspace migration 只引入 Nx tooling、project metadata、target mapping 和 affected/graph 能力。
- Nx workspace migration 不迁移 `packages/shared` 到 `libs/contracts` 或 `libs/domain`。
- Nx workspace migration 不移动 app/lib 目录，不改数据库 schema，不改业务行为。
- Contracts migration 只迁移跨模块共享契约；`@pmx/shared` 暂时保留为兼容转发层。
- Contracts migration 不创建或迁移 `libs/domain`，不改 OpenAPI/api-client 生成链路，不改业务行为。
- Domain migration 只迁移纯领域逻辑；当前先迁移订单 CLOB draft 构建逻辑。
- Domain migration 不接收 Nest、Prisma、repository、OpenAPI DTO 或 Web UI 组件。
