# Nx workspace migration

## 目标

在保持现有 npm workspaces 与目录结构不变的前提下，引入 Nx，用于项目识别、任务映射、缓存、项目图和 affected 执行。

## 边界

- 包含：`nx` 依赖、`nx.json`、package-based project metadata、Nx targets、workspace 边界测试。
- 不包含：移动 `apps/*`、`libs/*`、`packages/*` 目录。
- 不包含：`packages/shared` 到 `libs/contracts` / `libs/domain` 的迁移。
- 不包含：业务代码、数据库 schema、OpenAPI contract 的行为变更。

## 项目

| 项目 | 路径 | Tags |
|---|---|---|
| `web` | `apps/web` | `type:app`, `scope:web` |
| `admin` | `apps/admin` | `type:app`, `scope:admin` |
| `api` | `apps/api` | `type:app`, `scope:api` |
| `api-client` | `libs/api-client` | `type:lib`, `scope:shared`, `layer:client` |
| `contracts` | `libs/contracts` | `type:lib`, `scope:contracts`, `layer:contracts` |
| `shared` | `packages/shared` | `type:lib`, `scope:shared` |

## 验证方式

- Workspace 边界：`npm run test:nx-workspace`
- 项目识别：`npx nx show projects`
- V2 build targets：`npx nx run web:build`、`npx nx run admin:build`、`npx nx run api:build`
- OpenAPI/client targets：`npx nx run api:openapi`、`npx nx run api-client:generate`、`npx nx run api-client:typecheck`
- Affected：`npx nx affected -t build test`
- 原有入口：`npm test`、`npm run build`

## 当前状态

- `nx.json` 已加入 target defaults 和 cache 配置。
- 各 workspace package 已声明 `nx.name`、`nx.tags` 和必要自定义 targets。
- 根目录已忽略 `.nx/` 本地缓存。
