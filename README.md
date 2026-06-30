# PMX Polymarket 交易工作台

PMX 是一个非托管的 Polymarket 交易准备和纸币交易工作台。当前版本的重点是建立可验证的交易准备链路：认证、市场浏览、钱包证明、Deposit Wallet readiness、资金 readiness、订单预览、签名载荷记录、paper submit、纸币持仓，以及 Admin 风险与审计后台。

真实 CLOB submit 仍未实现，也不会因为手动批准而自动启用。`manual-live-approval` 只记录“谁批准、为什么批准、何时撤销”，不提交真实订单、不移动用户资金。

## 当前状态

| 模块 | 状态 |
|---|---|
| Nx Workspace | 已实现，包含项目 metadata、workspace targets 和验证入口 |
| Contracts / Shared | 已实现，`libs/contracts` 为共享契约入口，`@pmx/shared` 保持兼容转发 |
| Domain | 已实现，订单领域逻辑放在 `libs/domain` |
| API Client | 已实现，Web/Admin 通过 `@pmx/api-client` 使用生成/类型化 API |
| API Repository Boundaries | 已实现，API 服务优先走 repository 边界 |
| Web Flow Layer | 已实现，Web UI 通过 actions/flows 调用业务流程 |
| Orders Paper Loop | 已实现，订单支持 preview -> signing requested -> signed -> paper submitted |
| Paper Portfolio | 已实现，paper submit 写入本地 Trade/Position，Web Portfolio 可读取 |
| Audit Log | 已实现，认证、订单、portfolio、live approval 写入审计记录 |
| Risk Gates | 已实现，Admin `/risk` 汇总上线前风险关口 |
| Wallet Funding Readiness | 已实现，基于缓存的 Deposit Wallet pUSD 与 allowance 状态判断 |
| Manual Live Approval | 已实现，Admin-only 批准/撤销记录和审计，不启用真实 CLOB submit |

## 技术栈

| 区域 | 技术 | 路径 |
|---|---|---|
| Web | Next.js, React, Vitest | `apps/web` |
| Admin | Vue 3, Vite, Pinia, Vue Router, Ant Design Vue | `apps/admin` |
| API | NestJS, Prisma, BullMQ, Jest | `apps/api` |
| Contracts | TypeScript shared contracts | `libs/contracts` |
| Domain | Pure TypeScript domain logic | `libs/domain` |
| API Client | Generated/typed API client | `libs/api-client` |
| Database | PostgreSQL, Prisma migrations | `apps/api/prisma` |
| Queue/Cache | Redis, BullMQ | `apps/api/src/jobs` |
| E2E | Playwright | `tests/e2e` |

## 本地启动

要求：

- Node.js `>=20.11`
- Admin workspace 需要 Node.js `>=20.19.0`
- Docker / Docker Compose

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

启动后访问：

| 服务 | 地址 |
|---|---|
| Web | `http://127.0.0.1:3000` |
| Admin | `http://127.0.0.1:3001/#/login` |
| API Health | `http://127.0.0.1:4000/health` |

默认本地 Admin：

| 字段 | 值 |
|---|---|
| Email | `admin@pmx.local` |
| Password | `change-me-123` |

## 常用命令

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:e2e
```

单独启动：

```bash
npm run start:dev --workspace @pmx/api
npm run dev --workspace @pmx/web
npm run dev --workspace @pmx/admin
```

常用 targeted verification：

```bash
npm test --workspace @pmx/api -- auth
npm test --workspace @pmx/api -- orders
npm test --workspace @pmx/api -- admin
npm test --workspace @pmx/web -- order
npm run build --workspace @pmx/admin
npm run test --workspace @pmx/api-client
```

## 核心流程

1. Web 读取市场、账户、钱包、订单和 portfolio 状态。
2. API 通过 Prisma 读写 PostgreSQL。
3. Redis/BullMQ 用于异步同步和后续队列任务。
4. 市场数据读取 Polymarket Gamma API，用于展示和同步。
5. 用户通过自己的 EVM 钱包完成证明和签名准备。
6. 订单 preview 创建 CLOB V2 draft，并持久化 `PREVIEWED` 本地订单。
7. 签名 intent 和 signed payload 只记录本地准备状态。
8. `ORDER_ROUTER_MODE=paper` 可执行本地 paper submit，并写入 Trade/Position。
9. `ORDER_ROUTER_MODE=live` 仍拒绝 submit，因为真实 CLOB submit 未实现。
10. Admin 读取 audit、orders、risk gates 和 live approval 状态，不参与用户签名或资金控制。

## 安全边界

| 项目 | 当前边界 |
|---|---|
| 资金托管 | 平台不托管用户资金 |
| 私钥 | 平台不接触、不保存用户私钥、mnemonic、seed 或 secret-like 字段 |
| 真实交易 | 真实 CLOB submit 未实现，live 模式仍被阻断 |
| Paper trading | 只写本地 paper order、trade、position 数据 |
| Manual approval | 只记录 Admin approval/revoke 状态，不改变 submit 行为 |
| Admin risk | 只读取缓存状态，不触发链上刷新或外部 CLOB 调用 |
| Audit log | 写入结构化审计记录，并清理敏感 metadata |

## 依赖风险说明

2026-06-30 已运行 `npm audit fix`，安全更新了 lockfile 中可自动修复的依赖。剩余 `npm audit` 风险主要来自上游依赖链：

| 来源 | 说明 |
|---|---|
| Polymarket SDK | 仍包含旧 `axios`、`ethers@5`、`viem`、`ws` 链路，替换需要单独做 SDK 合约评审 |
| Nest / multer | `npm audit fix --force` 会建议破坏性降级 Nest，不直接执行 |
| Next / postcss | `npm audit fix --force` 会建议破坏性降级 Next，不直接执行 |
| Vite / esbuild | npm 报告普通修复路径，但当前 workspace 解析没有产生兼容更新 |

## 文档入口

| 文档 | 用途 |
|---|---|
| `docs/project-memory.md` | 项目记忆、稳定事实、验证命令 |
| `docs/module-index.md` | 模块状态和强绑定关系 |
| `docs/modules/` | 独立模块文档 |
| `docs/development-reports/2026-06-30-pmx-development-report.md` | 2026-06-30 开发报告 |
| `docs/local-development.md` | 本地开发说明 |
| `docs/development-plan.md` | 项目开发计划 |

## 最新验证

2026-06-30 当前分支验证通过：

```bash
npm test
npm run build
npm run lint
npm run test:e2e
```

其中 `npm run test:e2e` 通过 16/16。
