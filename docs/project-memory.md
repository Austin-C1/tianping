# 项目记忆

## 项目状态

- 当前主线以 `main` / `origin/main` 为准，不继续使用旧功能分支。
- V2 Web Business Flow Layer 已完成。
- API repository boundaries 已完成。
- 当前模块：Full OpenAPI-generated `libs/api-client`。

## 已验证的运行方式

- 生成 Prisma Client：`npm run prisma:generate`
- 生成 OpenAPI 与 api-client schema：`npm run generate --workspace @pmx/api-client`
- API OpenAPI 文档单测：`npm run test --workspace @pmx/api -- openapi-document.spec.ts`
- api-client 单测：`npm run test --workspace @pmx/api-client`
- Web flow 边界测试：`npm run test:flow --workspace @pmx/web -- ui-client-boundary.test.ts`
- Admin API 边界测试：`npm run test --workspace @pmx/admin -- api-client-boundary.test.ts`

## 开发边界

- `libs/api-client` 只负责 OpenAPI 生成类型、HTTP 调用封装、base URL 和 Bearer header 处理。
- Web module actions 和 flows 仍是业务流程边界；不要把业务编排放进 api-client。
- 本模块不包含 Nx workspace migration。
- 本模块不迁移 `libs/contracts` 或 `libs/domain`。
