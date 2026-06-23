# PMX 开发计划

## 当前基线

| 项目 | 状态 |
|---|---|
| Web | `http://localhost:3000` 可访问，当前是交易工作台原型 |
| Admin | `http://localhost:3001/#/dashboard` 可访问，已使用 Vue 3 + Vite + Pinia + Vue Router + Ant Design Vue 的 Vben v5 方向实现 |
| API | `http://localhost:4000/health` 可访问，返回 `ok: true` |
| 数据库 | PostgreSQL + Prisma 已用于真实注册、登录、用户列表 |
| Redis | 已作为 BullMQ 和后续限流/同步状态基础服务 |
| 已跑通 | 注册、登录、账户页、管理员登录、后台用户列表 |
| 未完成 | 完整官方 Vben v5 工程接入、真实 Polymarket 市场数据、钱包绑定、Deposit Wallet、订单预览、CLOB 下单 |

## 总方向

| 项目 | 决策 |
|---|---|
| 前台 Web | 继续使用 Next.js，首页就是交易工作台，不做营销页 |
| 后台 Admin | 继续按 Vben v5 技术方向建设后台，优先补齐权限、菜单、运营页面和真实 API |
| 后端 API | 保留 NestJS + Prisma + PostgreSQL + Redis + BullMQ |
| 当前优先级 | 先稳定本地闭环和后台，再重构前台，再接只读市场数据，最后处理钱包和交易 |
| 默认不做 | 不托管用户资金，不代签订单，不自动提交真实 CLOB，不做收费功能 |

## 阶段顺序

| 顺序 | 阶段 | 目标 | 验收 |
|---:|---|---|---|
| 0 | 基线回归 | 确认本地三端、DB、Redis、测试都可用 | 三个网址可打开；`npm run build`、`npm test`、`npm run test:e2e` 通过 |
| 1 | 文档校准 | 文档和当前代码状态一致 | `docs` 中不再出现过期后台方案描述，中文显示正常 |
| 2 | Admin 正式 Vben 化 | 后台登录、权限、布局、菜单稳定 | ADMIN 可进后台，USER 被拒绝，Users 页读取真实 API |
| 3 | Admin 真实运营页 | Markets、Orders、Audit、Risk、Settings 不再只是占位 | 后台显示真实 API 状态、空状态、同步状态和人工 Gate |
| 4 | Web Product Design 重构 | 前台变成清晰交易工作台 | 市场、钱包、交易准备、订单预览、人工 Gate 首屏可见 |
| 5 | Polymarket 只读市场数据 | 接公开市场数据，不交易 | 前台显示真实市场，后台显示同步时间和失败原因 |
| 6 | 钱包绑定 | 用户连接 EVM 钱包并签名证明归属 | 账户页和后台用户页都能看到钱包绑定状态 |
| 7 | Deposit Wallet | 查询/创建非托管 Deposit Wallet | 用户能看到 Deposit Wallet 地址、状态、失败原因 |
| 8 | 入金与授权引导 | 展示资金路径、余额、授权状态和风险 | 用户清楚入金地址、授权对象和下一步 |
| 9 | 订单预览 | 下单前完整校验，不提交真实 CLOB | 价格、数量、成本、余额、地区限制、人工 Gate 都可验 |
| 10 | CLOB mock 签名链路 | 用户签名后先提交到 mock provider | 订单进入本地 DB，后台能看到状态和失败原因 |
| 11 | 小额真实 CLOB 测试 | 人工确认后进行小额真实链路测试 | 指定市场、金额上限、撤单、状态同步全部通过 |
| 12 | 风控与内测收口 | geoblock、rate limit、audit log 完整化 | 关键动作留痕，受限操作被拦截，后台可排查 |

## 最近三步

| 顺序 | 任务 | 原因 | 验收 |
|---:|---|---|---|
| 1 | Admin 正式 Vben 化 | 后台是后续市场、订单、审计和风控入口 | Admin 登录、权限、菜单、用户页真实可用 |
| 2 | Web Product Design 重构 | 前台需要先有正确产品形态，再接真实数据 | Playwright 验证核心布局、注册入口、市场搜索、订单预览 |
| 3 | Polymarket 只读市场数据 | 先接只读数据，避免过早碰真实交易风险 | 前台展示真实市场，后台能看到同步状态 |

## 每阶段统一验收

每个阶段完成后都要尽量执行：

```bash
npm run build
npm test
npm run test:e2e
```

浏览器检查：

| 页面 | 检查 |
|---|---|
| `http://localhost:3000` | Web 首页和核心交互 |
| `http://localhost:3001/#/dashboard` | Admin 登录态、菜单、真实数据 |
| `http://localhost:4000/health` | API 健康状态 |

必须保持：

- 注册、登录、账户页不被破坏。
- 普通 USER 不能进入 Admin。
- ADMIN 能进入 Admin 并看到真实用户数据。
- 真实 CLOB 提交默认关闭。
- 未经过人工确认，不启用真实交易 provider。

## 人工 Gate

| Gate | 触发点 | 必须确认 |
|---|---|---|
| G1 | 接完整官方 Vben v5 monorepo 前 | 是否接受 pnpm、monorepo 和大量模板迁移成本 |
| G2 | 接真实 Polymarket 数据前 | 市场字段、展示口径、失败重试策略 |
| G3 | 钱包连接上线前 | 支持的钱包、链、RPC 服务商 |
| G4 | Deposit Wallet 调真实 API 前 | Relayer、Builder、CLOB 权限和调用方式 |
| G5 | 入金引导上线前 | 地区限制、风险提示、入金文案 |
| G6 | 真实订单提交前 | 人工确认文案、金额上限、测试市场 |
| G7 | 小额真实交易前 | CLOB 权限、金额上限、失败处理预案 |
| G8 | 内测前 | 内测名单、日志保留、风控规则 |
