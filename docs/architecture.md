# PMX 架构说明

## 项目目标

PMX 是一个非托管 Polymarket 第三方交易工作台。

第一阶段目标不是盈利，也不是托管用户资产，而是建立一条可验证的真实交易准备链路：

注册 -> 登录 -> 浏览市场 -> 绑定钱包 -> 创建或查询 Deposit Wallet -> 入金/授权检查 -> 订单预览 -> 用户签名 -> API 校验 -> CLOB 提交 -> 订单、成交、持仓同步。

真实 CLOB 下单必须放在最后，并且需要人工 Gate。

## 应用分层

| 层 | 路径 | 职责 |
|---|---|---|
| Web | `apps/web` | 面向交易用户的 Next.js 前台。负责市场浏览、账户状态、钱包连接、Deposit Wallet、入金引导、订单预览、签名确认、订单和持仓展示 |
| Admin | `apps/admin` | 面向运营和风控的 Vue 3 + Vite 后台。当前按 Vben v5 技术方向建设，使用 Pinia、Vue Router、Ant Design Vue |
| API | `apps/api` | NestJS 后端。负责认证、权限、Prisma 数据访问、市场数据代理、订单校验、钱包状态、审计和风控 |
| Shared | `packages/shared` | 前后端共享的阶段、Gate、类型和常量 |
| Database | `apps/api/prisma/schema.prisma` | PostgreSQL schema，保存用户、角色、钱包、市场快照、订单、审计日志等 |
| Queue | `apps/api/src/jobs` | BullMQ 队列，后续负责市场同步、订单同步、成交和持仓同步 |
| Docs | `docs` | 架构边界、开发计划、本地运行和验收标准 |

## 当前技术栈

| 技术 | 用途 |
|---|---|
| Next.js + React | 用户交易前台 |
| Vue 3 + Vite | 管理后台 |
| Pinia | Admin 状态管理 |
| Vue Router | Admin 路由和权限守卫 |
| Ant Design Vue | Admin UI 组件 |
| NestJS | 后端 API 和模块边界 |
| Prisma | PostgreSQL schema、迁移和数据访问 |
| PostgreSQL | 用户、钱包、市场、订单、审计等持久化数据 |
| Redis | BullMQ、后续限流和同步状态 |
| BullMQ | 异步市场、订单、成交、持仓同步 |
| Jest | API 单元测试 |
| Vitest | Web 单元测试 |
| Playwright | 浏览器端 E2E 验收 |

## 前台与后台边界

| 应用 | 面向对象 | 可以做 | 不可以做 |
|---|---|---|---|
| Web | 交易用户 | 注册、登录、浏览市场、绑定钱包、查看 Deposit Wallet、预览订单、发起钱包签名、查看订单和持仓 | 代替用户签名、隐藏交易路径、托管资金、绕过人工确认 |
| Admin | 运营/风控人员 | 查看用户、市场同步、订单状态、风险事件、审计日志、人工 Gate 状态 | 代签订单、合并用户订单、内部撮合、直接操作用户资金 |
| API | 系统后端 | 校验权限、校验订单、代理数据、保存状态、同步 CLOB 状态、记录审计日志 | 保存用户私钥、代签真实订单、绕过用户钱包签名 |

## 数据流

1. Web 通过 API 读取市场、账户、钱包、订单和持仓状态。
2. API 通过 Prisma 读写 PostgreSQL。
3. Redis 和 BullMQ 用于异步同步和后续限流。
4. 市场数据阶段只接 Polymarket 公开数据，不交易。
5. 钱包阶段由用户连接自己的 EVM 钱包，并签名证明地址归属。
6. Deposit Wallet 阶段只查询或创建非托管 Deposit Wallet，平台不托管资金。
7. 订单预览阶段只返回校验结果、风险提示和待签名摘要，不提交 CLOB。
8. 用户签名后，API 只校验签名和订单摘要，再转发到 CLOB。
9. Admin 只读取运营数据和风险状态，不参与签名和资金控制。

## 安全与合规边界

| 项目 | 规则 |
|---|---|
| 资金托管 | 平台不托管用户资金，用户资金不进入平台账户 |
| 私钥 | 平台不接触、不保存用户私钥 |
| 订单签名 | 真实下单必须由用户钱包签名 |
| 订单路由 | API 只做校验、路由和状态同步 |
| 交易路径 | Web 必须展示交易路径、费用、风险和人工确认 Gate |
| 地区限制 | geoblock 策略上线前必须人工确认 |
| 审计 | 登录、钱包绑定、Deposit Wallet、入金状态、订单预览、真实提交、撤单等关键动作必须留痕 |
| 真实交易 | 没有人工确认 CLOB 权限、市场、金额上限前，不启用真实 provider |

## 当前完成标准

| 项目 | 判断标准 |
|---|---|
| 工程 | npm workspaces 能构建 Web、Admin、API、Shared |
| Web | 首页显示交易工作台原型，注册、登录、账户页可用 |
| Admin | 管理员可登录，普通用户被拒绝，Dashboard 和 Users 页读取真实 API |
| API | `/health` 正常，auth 和 admin users API 可用 |
| 数据库 | Prisma migration 和 seed 可执行 |
| 队列 | BullMQ 基础模块存在，Redis 可用 |
| 测试 | `npm run build`、`npm test`、`npm run test:e2e` 通过 |
