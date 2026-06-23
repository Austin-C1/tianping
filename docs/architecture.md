# Architecture

## 项目目标

开发一个 Polymarket 三方基础交易平台。当前阶段不做盈利功能，只做基础前后端平台和真实交易闭环。

## 当前范围

| 类型 | 内容 |
|---|---|
| 必须做 | Next.js 前端、NestJS 后端、PostgreSQL + Prisma、Redis + BullMQ、用户注册/登录、市场列表/搜索/详情、Polymarket 市场数据接入、钱包连接、Deposit Wallet 查询/创建、入金引导、下单预览、用户签名下单、CLOB 下单/撤单、订单/成交/持仓记录、geoblock、rate limit、audit log、Playwright + 单元/集成测试 |
| 明确不做 | Builder fee、广告、会员、数据售卖、平台托管钱包、多用户订单合并、内部撮合、自动跟单 |
| 第一版边界 | 使用非托管 Deposit Wallet；用户资金不进入平台账户；用户订单必须由用户钱包签名；后端只做校验、路由、状态同步；不合并多个用户订单；不隐藏交易路径 |

## 系统分层

| 层 | 路径 | 职责 |
|---|---|---|
| Web | `apps/web` | 用户注册/登录界面、市场浏览、钱包连接、Deposit Wallet 操作入口、入金引导、订单预览、签名确认、订单/成交/持仓展示 |
| API | `apps/api` | 认证、权限校验、Polymarket 数据代理、Deposit Wallet 状态查询、订单校验和路由、CLOB 状态同步、风控、审计日志 |
| Shared | `packages/shared` | 跨前后端共享的阶段、人工 Gate、基础类型和常量 |
| Database | `apps/api/prisma/schema.prisma` | 用户、钱包、市场快照、订单、成交、持仓、审计日志、速率限制事件 |
| Queue | `apps/api/src/jobs` | 市场数据同步、订单状态同步、成交/持仓同步、审计类异步任务 |
| Docs | `docs` | 架构约束、开发阶段、人工确认点、验收标准 |

## 数据流

1. Web 从 API 读取市场列表、详情、用户订单、成交和持仓。
2. API 从 Polymarket Gamma/CLOB 接入市场、订单和成交相关数据。
3. 用户连接自有钱包，Web 引导用户创建或查询非托管 Deposit Wallet。
4. 用户在 Web 做下单预览，API 返回校验后的交易路径、价格、数量、费用说明、风险提示和待签名内容。
5. 用户在钱包中签名订单。API 只接收已签名订单并转发到 CLOB。
6. API 通过队列同步订单状态、成交记录和持仓变化，写入 PostgreSQL。
7. geoblock、rate limit、audit log 在 API 层执行，并对关键行为留痕。

## 安全和合规边界

| 项目 | 规则 |
|---|---|
| 资金托管 | 平台不托管用户资金，资金不进入平台账户 |
| 订单签名 | 真实下单必须由用户钱包签名，后端不得代签 |
| 订单路由 | 后端只做校验、路由和状态同步，不做内部撮合 |
| 用户订单 | 不合并多个用户订单，不做自动跟单 |
| 交易路径 | 前端必须展示真实交易路径和风险提示，不隐藏关键步骤 |
| 地区限制 | geoblock 策略、风险提示、入金文案必须人工审核 |
| 权限事项 | Relayer、CLOB、Builder 相关权限必须人工确认后才能进入实现 |

## 技术骨架

| 技术 | 用途 |
|---|---|
| Next.js | 前端应用和路由 |
| NestJS | 后端 API、模块边界、依赖注入 |
| Prisma | PostgreSQL schema、迁移和数据库访问 |
| PostgreSQL | 持久化用户、钱包、订单、成交、持仓、审计 |
| Redis | 队列、限流和异步状态同步依赖 |
| BullMQ | 市场数据、订单状态、成交和持仓同步任务 |
| Playwright | 浏览器端主流程验收 |
| Jest | NestJS 单元和集成测试 |
| Vitest | Web 单元测试 |

## 当前阶段完成标准

| 项目 | 判断标准 |
|---|---|
| 工程骨架 | 根目录 npm workspaces 可安装依赖，`apps/web`、`apps/api`、`packages/shared` 存在 |
| 前端 | Next.js 首页可构建，展示当前阶段和人工 Gate |
| 后端 | NestJS 可构建，`/health` 可返回运行状态 |
| 数据库 | Prisma schema 包含第一版核心实体，可执行 generate |
| 队列 | BullMQ 连接配置和队列名称固化 |
| 文档 | 架构范围、阶段、人工确认点、验收目标固化到 `docs` |
| 测试 | Web/API 单元测试入口和 Playwright 验收入口存在 |
