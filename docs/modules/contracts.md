# Contracts migration

## 目标

建立 `@pmx/contracts`，承载跨 app/API/lib 共享的稳定契约类型与常量。

## 边界

- 包含：`libs/contracts` package、TypeScript build/test、Nx project metadata、root build 顺序、`@pmx/shared` 兼容转发。
- 不包含：`libs/domain` 迁移。
- 不包含：API DTO/OpenAPI/api-client 生成链路变更。
- 不包含：业务行为、数据库 schema、前端页面行为变更。

## 当前内容

- `PLATFORM_PHASES`
- `PlatformPhase`
- `MANUAL_GATES`
- `ManualGate`

## 兼容关系

- 新入口：`@pmx/contracts`
- 兼容入口：`@pmx/shared`
- `@pmx/shared` 只从 `@pmx/contracts` 转发当前共享契约。

## 验证方式

- Workspace 边界：`npm run test:nx-workspace`
- Contracts build/test：`npm run build --workspace @pmx/contracts`、`npm run test --workspace @pmx/contracts`
- Shared 兼容层：`npm run build --workspace @pmx/shared`、`npm run test --workspace @pmx/shared`
- Nx 项目识别：`npx nx show projects`
- 全量回归：`npm test`、`npm run build`

## 当前状态

- 已完成。
