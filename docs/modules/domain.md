# Domain migration

## 目标

建立 `@pmx/domain`，承载不依赖框架、数据库或外部服务的纯领域逻辑。

## 边界

- 包含：`libs/domain` package、订单 CLOB draft 类型和 `toClobOrderDraft`、domain build/test、API 订单服务接入。
- 不包含：Nest provider/module、Prisma repository、数据库 schema、OpenAPI DTO、api-client、Web UI 计算器迁移。
- 不包含：业务行为变更。

## 当前内容

- `toClobOrderDraft`
- `ClobOrderDraftInput`
- `ClobOrderDraft`
- CLOB side/type/signature/tick-size 类型
- 订单 readiness 相关基础类型

## 接入关系

- 新入口：`@pmx/domain`
- API 接入：`apps/api/src/orders/orders.service.ts`
- API 本地 `apps/api/src/orders/order-domain.ts` 已移除。

## 验证方式

- Domain 行为：`npm run test --workspace @pmx/domain`
- Domain build：`npm run build --workspace @pmx/domain`
- API orders 回归：`npm run test --workspace @pmx/api -- orders.service`
- Workspace 边界：`npm run test:nx-workspace`
- Nx 项目识别：`npx nx show projects`
- 全量回归：`npm test`、`npm run build`

## 当前状态

- 已完成。
