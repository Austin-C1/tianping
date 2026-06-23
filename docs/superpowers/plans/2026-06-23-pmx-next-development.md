# PMX Next Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前已可访问的 PMX 本地闭环，按可验收顺序推进到真实市场数据、钱包绑定、订单预览和 CLOB 小额测试前状态。

**Architecture:** Web 保持 Next.js，作为交易工作台；Admin 使用 Vben v5 方向，作为运营、风控和审计后台；API 保持 NestJS + Prisma + PostgreSQL + Redis + BullMQ。真实资金和真实 CLOB 下单放在最后，前置阶段只做只读数据、状态校验、签名证明和人工 Gate。

**Tech Stack:** Next.js, React, Vue 3, Vite, TypeScript, Pinia, Vue Router, Ant Design Vue, NestJS, Prisma, PostgreSQL, Redis, BullMQ, Playwright, Vitest, Jest.

---

## 当前基线

| 项目 | 状态 |
|---|---|
| API | `http://localhost:4000/health` 正常返回 `ok: true` |
| Web | `http://localhost:3000` 可打开交易工作台原型 |
| Admin | `http://localhost:3001/#/dashboard` 可用，管理员已能看到 Dashboard 和用户数据 |
| DB/Redis | PostgreSQL/Redis 本地容器已跑通 |
| 当前限制 | Web 市场仍是占位数据；Admin 还不是完整官方 Vben v5 工程；Markets/Orders/Audit/Risk/Settings 多数还是占位页 |

---

## 总顺序

| 顺序 | 阶段 | 目标 | 验收 |
|---:|---|---|---|
| 0 | 基线回归 | 确认本地三端、DB、Redis、测试都可用 | 三个网址可打开；`npm run build`、`npm test`、`npm run test:e2e` 通过 |
| 1 | 文档校准 | 修正旧文档里的过期后台方案、中文显示问题和过期阶段描述 | `docs` 中计划、架构、开发说明和当前代码一致 |
| 2 | Admin 正式 Vben 化 | 将当前 Vben-style 后台升级成明确的 Vben v5 结构或保留精简实现但清楚标注 | 登录、权限、菜单、用户页真实可用 |
| 3 | Admin 真实运营页 | Markets、Orders、Audit、Risk、Settings 不再只是占位 | 后台能看到真实 DB/API 状态和人工 Gate |
| 4 | Web Product Design 重构 | 前台从页面壳改成真正交易工作台 | 首页即工作台；登录/钱包/市场/订单预览状态清楚 |
| 5 | Polymarket 只读市场数据 | 接 Gamma/CLOB 公开市场数据，不交易 | Web 展示真实市场；Admin 展示同步状态 |
| 6 | 钱包绑定 | 用户连接 EVM 钱包并签名证明归属 | 账户页和后台用户页都能看到钱包绑定状态 |
| 7 | Deposit Wallet | 查询/创建非托管 Deposit Wallet | 用户能看到 Deposit Wallet 地址、状态、失败原因 |
| 8 | 入金与授权引导 | 只做说明、余额/授权状态查询，不托管资金 | 用户清楚资金路径、授权对象、风险提示 |
| 9 | 订单预览 | 下单前完整校验和预览，不提交 CLOB | 价格、数量、成本、余额、地区限制、人工 Gate 都可验 |
| 10 | CLOB mock 签名链路 | 用户签名后先打 CLOB mock，不碰真实资金 | 订单进入本地 DB，状态和失败原因可查 |
| 11 | 小额真实 CLOB 测试 | 人工确认后做真实小额测试 | 指定市场、金额上限、撤单和状态同步全部通过 |
| 12 | 风控与内测收口 | geoblock、rate limit、audit log、异常排查 | 关键动作留痕，受限操作被拦截，内测流程可复现 |

---

## Task 0: 基线回归

**Files:**
- Read: `package.json`
- Read: `docker-compose.yml`
- Verify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: 检查工作区**

```bash
git status --short --branch
```

Expected: 当前分支和 `origin/main` 对齐；如有未提交内容，先确认是否属于本次任务。

- [ ] **Step 2: 检查本地服务**

```bash
docker compose ps
```

Expected: PostgreSQL 和 Redis 都是 running/healthy。

- [ ] **Step 3: 检查 API**

```bash
curl http://localhost:4000/health
```

Expected: 返回包含 `"ok":true` 和 `"service":"pmx-api"`。

- [ ] **Step 4: 跑完整回归**

```bash
npm run build
npm test
npm run test:e2e
```

Expected: 三个命令全部通过。

- [ ] **Step 5: 浏览器验收**

Open:
- `http://localhost:3000`
- `http://localhost:3001/#/dashboard`
- `http://localhost:4000/health`

Expected: Web、Admin、API 三个页面都能打开。

**通过标准:** 不修功能前先确认当前主干可运行。
**不通过处理:** 先修基础环境，不进入后续阶段。

---

## Task 1: 文档校准

**Files:**
- Modify: `docs/development-plan.md`
- Modify: `docs/architecture.md`
- Modify: `docs/local-development.md`

- [ ] **Step 1: 修正当前状态**

把文档中的旧后台方案改为当前事实：Admin 已经转为 Vue 3 + Vite + Pinia + Vue Router + Ant Design Vue 的 Vben v5 方向后台。

- [ ] **Step 2: 写清楚当前完成和未完成**

文档必须明确：
- 已完成：本地 DB/Redis/API/Web/Admin 可运行，注册、登录、账户、管理员登录、用户列表可用。
- 未完成：完整官方 Vben v5 接入、真实市场数据、钱包绑定、Deposit Wallet、订单预览、真实交易。

- [ ] **Step 3: 修正验收命令**

文档统一使用：

```bash
npm run build
npm test
npm run test:e2e
```

- [ ] **Step 4: 验证文档可读**

```bash
git diff -- docs/development-plan.md docs/architecture.md docs/local-development.md
```

Expected: 中文正常显示；内容和当前代码状态一致。

**通过标准:** 新人只看 `docs` 就能知道现在能跑什么、下一步先做什么。
**提交建议:** `docs: refresh pmx development plan`

---

## Task 2: Admin 正式 Vben 化

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/vite.config.ts`
- Modify: `apps/admin/src/main.ts`
- Modify: `apps/admin/src/App.vue`
- Modify: `apps/admin/src/router/index.ts`
- Modify: `apps/admin/src/stores/auth.ts`
- Modify: `apps/admin/src/api/auth.ts`
- Modify: `apps/admin/src/api/admin.ts`
- Modify: `apps/admin/src/layouts/AdminLayout.vue`
- Modify: `apps/admin/src/views/LoginView.vue`
- Modify: `apps/admin/src/views/DashboardView.vue`
- Modify: `apps/admin/src/views/UsersView.vue`
- Modify: `apps/admin/src/views/PlaceholderView.vue`

- [ ] **Step 1: 明确 Admin 方案**

推荐：保持当前轻量 Vben v5 技术栈实现，按 Vben v5 的权限、菜单、主题和布局思路补齐，不引入完整 monorepo。

原因：
- 当前 npm workspace 已稳定。
- 完整 Vben v5 monorepo 会带来 pnpm、包结构和大量无关模板迁移。
- 当前目标是后台业务闭环，不是复刻 Vben 模板工程。

- [ ] **Step 2: 修正登录和权限守卫**

ADMIN 用户才能进入后台；USER 登录后台时必须被拒绝，并显示清楚错误。

- [ ] **Step 3: 菜单和路由固定**

后台菜单保留：
- Dashboard
- Users
- Markets
- Orders
- Audit
- Risk
- Settings

- [ ] **Step 4: 跑 Admin 构建**

```bash
npm run build --workspace @pmx/admin
```

Expected: Vite build 通过。

- [ ] **Step 5: 浏览器验收**

Open:
- `http://localhost:3001/#/login`
- `http://localhost:3001/#/dashboard`
- `http://localhost:3001/#/users`

Expected:
- `admin@pmx.local` 可以登录。
- 普通用户不能进入 Admin。
- Dashboard 和 Users 能正常渲染。

**通过标准:** Admin 是明确的 Vben v5 方向后台，登录、权限、菜单、用户列表真实可用。
**提交建议:** `feat: harden vben admin shell`

---

## Task 3: Admin 真实运营页

**Files:**
- Modify: `apps/api/src/users/users.controller.ts`
- Modify: `apps/api/src/users/users.service.ts`
- Modify: `apps/api/src/users/users.service.spec.ts`
- Create: `apps/api/src/admin/admin.module.ts`
- Create: `apps/api/src/admin/admin.controller.ts`
- Create: `apps/api/src/admin/admin.service.ts`
- Create: `apps/api/src/admin/admin.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/admin/src/api/admin.ts`
- Modify: `apps/admin/src/views/DashboardView.vue`
- Modify: `apps/admin/src/views/PlaceholderView.vue`

- [ ] **Step 1: 新增 Admin summary API**

Endpoint:
- `GET /admin/summary`

Response fields:
- `registeredUsers`
- `adminUsers`
- `walletsConnected`
- `marketsSynced`
- `ordersPreviewed`
- `openRiskEvents`

- [ ] **Step 2: 新增 Gate API**

Endpoint:
- `GET /admin/gates`

Response fields:
- `key`
- `title`
- `owner`
- `status`
- `updatedAt`

- [ ] **Step 3: Admin 页面接真实 API**

Dashboard 读 `/admin/summary` 和 `/admin/gates`。Markets/Orders/Audit/Risk/Settings 页面显示真实空状态，不显示假数据。

- [ ] **Step 4: 测试**

```bash
npm test --workspace @pmx/api
npm run build --workspace @pmx/admin
```

Expected: API 单测通过，Admin 构建通过。

**通过标准:** 后台不再只靠前端硬编码 Dashboard；运营页显示真实 API 状态。
**提交建议:** `feat: add admin operations summary`

---

## Task 4: Web Product Design 交易工作台

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/features/auth/account-panel.tsx`
- Modify: `apps/web/src/app/page.test.tsx`
- Modify: `tests/e2e/home.spec.ts`

- [ ] **Step 1: 首页固定为工作台**

不要做营销页。首屏必须显示：
- 市场搜索
- 市场列表
- 交易准备状态
- 钱包状态
- Deposit Wallet 状态
- 订单预览
- 人工确认 Gate

- [ ] **Step 2: 状态分层**

Web 必须能清楚区分：
- 未登录
- 已登录但未连钱包
- 已连钱包但未创建 Deposit Wallet
- 可以预览订单但不能真实下单

- [ ] **Step 3: 测试**

```bash
npm test --workspace @pmx/web
npm run test:e2e
```

Expected: Vitest 和 Playwright 都通过。

**通过标准:** 用户打开首页就能知道市场、钱包、资金、订单预览分别处于什么状态。
**提交建议:** `feat: redesign web trading workspace`

---

## Task 5: Polymarket 只读市场数据

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/markets/polymarket.client.ts`
- Create: `apps/api/src/markets/markets.service.ts`
- Create: `apps/api/src/markets/markets.controller.ts`
- Create: `apps/api/src/markets/markets.service.spec.ts`
- Modify: `apps/api/src/markets/markets.module.ts`
- Modify: `apps/api/src/jobs/queue-names.ts`
- Create: `apps/api/src/jobs/market-sync.processor.ts`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/admin/src/api/admin.ts`

- [ ] **Step 1: DB 增加市场快照**

新增模型包含：
- external market id
- question/title
- slug
- outcomes
- prices
- volume/liquidity
- status
- syncedAt
- raw payload

- [ ] **Step 2: API 只读市场端点**

Endpoints:
- `GET /markets`
- `GET /markets/:id`
- `POST /admin/markets/sync`

- [ ] **Step 3: Web 使用真实市场列表**

首页市场列表从 `/markets` 读取；失败时显示同步失败状态，不回退假数据。

- [ ] **Step 4: Admin 显示同步状态**

后台 Markets 页显示：
- 最近同步时间
- 市场数量
- 最近失败原因

- [ ] **Step 5: 测试**

```bash
npm run db:migrate
npm test --workspace @pmx/api
npm test --workspace @pmx/web
npm run test:e2e
```

Expected: 市场 API mock 测试通过；Web 可显示真实或 mock 市场。

**通过标准:** 前台不再展示占位市场，后台能看到市场同步状态。
**提交建议:** `feat: sync read-only polymarket markets`

---

## Task 6: 钱包绑定

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/wallets/wallets.controller.ts`
- Create: `apps/api/src/wallets/wallets.service.ts`
- Create: `apps/api/src/wallets/wallets.service.spec.ts`
- Modify: `apps/api/src/wallets/wallets.module.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/src/features/wallet/wallet-client.ts`
- Create: `apps/web/src/features/wallet/wallet-panel.tsx`
- Modify: `apps/web/src/app/account/page.tsx`
- Modify: `apps/admin/src/views/UsersView.vue`

- [ ] **Step 1: 增加钱包签名 nonce**

Endpoints:
- `POST /wallets/nonce`
- `POST /wallets/verify`
- `GET /wallets/me`

- [ ] **Step 2: 前台接 wagmi/viem**

用户连接钱包后必须签名证明地址归属。

- [ ] **Step 3: 后台显示钱包状态**

Users 页显示：
- wallet count
- primary wallet address
- wallet status

- [ ] **Step 4: 测试**

```bash
npm run db:migrate
npm test --workspace @pmx/api
npm test --workspace @pmx/web
npm run build
```

Expected: 签名验证 mock 通过；构建通过。

**通过标准:** 用户账户绑定一个 EVM 地址，后台能看到绑定状态。
**提交建议:** `feat: add wallet ownership binding`

---

## Task 7: Deposit Wallet

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/wallets/deposit-wallet.service.ts`
- Create: `apps/api/src/wallets/deposit-wallet.service.spec.ts`
- Modify: `apps/api/src/wallets/wallets.controller.ts`
- Modify: `apps/web/src/features/wallet/wallet-panel.tsx`
- Modify: `apps/admin/src/views/UsersView.vue`

- [ ] **Step 1: 先做 mock provider**

真实 Relayer/Builder/CLOB 权限确认前，Deposit Wallet provider 使用 mock 实现。

- [ ] **Step 2: 增加 Deposit Wallet API**

Endpoints:
- `GET /wallets/deposit`
- `POST /wallets/deposit`

- [ ] **Step 3: 状态落库**

保存：
- deposit wallet address
- status
- provider
- last sync time
- last error

- [ ] **Step 4: 测试**

```bash
npm run db:migrate
npm test --workspace @pmx/api
npm run test:e2e
```

Expected: 创建、查询、失败重试路径都有测试。

**通过标准:** 用户能看到 Deposit Wallet 地址和状态；失败原因可追踪。
**人工 Gate:** 真实 API 权限和调用方式确认后，才能替换 mock provider。
**提交建议:** `feat: add deposit wallet state`

---

## Task 8: 入金与授权引导

**Files:**
- Create: `apps/api/src/wallets/balance.service.ts`
- Create: `apps/api/src/wallets/allowance.service.ts`
- Modify: `apps/api/src/wallets/wallets.controller.ts`
- Modify: `apps/web/src/features/wallet/wallet-panel.tsx`
- Create: `apps/web/src/features/wallet/funding-panel.tsx`
- Modify: `apps/admin/src/views/UsersView.vue`

- [ ] **Step 1: 只读余额和授权状态**

Endpoints:
- `GET /wallets/balance`
- `GET /wallets/allowance`

- [ ] **Step 2: Web 显示资金路径**

必须显示：
- 用户自有钱包地址
- Deposit Wallet 地址
- 授权对象
- 当前余额/授权状态
- 风险提示

- [ ] **Step 3: 测试**

```bash
npm test --workspace @pmx/api
npm test --workspace @pmx/web
```

Expected: 余额不足、未授权、查询失败都有明确状态。

**通过标准:** 用户能看懂入金和授权路径；平台不托管资金。
**人工 Gate:** 入金文案、地区限制、风险提示必须人工确认。
**提交建议:** `feat: add funding readiness checks`

---

## Task 9: 订单预览

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/orders/order-preview.controller.ts`
- Create: `apps/api/src/orders/order-preview.service.ts`
- Create: `apps/api/src/orders/order-preview.service.spec.ts`
- Modify: `apps/api/src/orders/orders.module.ts`
- Create: `apps/web/src/features/orders/order-preview-panel.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/admin/src/views/PlaceholderView.vue`

- [ ] **Step 1: 新增订单预览 API**

Endpoint:
- `POST /orders/preview`

Request fields:
- market id
- outcome id
- side
- price
- size

Response fields:
- estimated cost
- max loss
- fees
- balance check
- market status check
- region check
- manual gate summary
- unsigned order digest

- [ ] **Step 2: 保存预览记录**

只保存预览，不提交 CLOB。

- [ ] **Step 3: Web 预览区接真实 API**

订单区必须显示：
- 买/卖方向
- 价格
- 数量
- 预计成本
- 风险提示
- 人工确认 Gate

- [ ] **Step 4: 测试**

```bash
npm run db:migrate
npm test --workspace @pmx/api
npm test --workspace @pmx/web
npm run test:e2e
```

Expected: 余额不足、价格异常、受限地区、市场关闭都能拦截。

**通过标准:** 真实下单前必须经过订单预览和人工确认 Gate。
**提交建议:** `feat: add guarded order previews`

---

## Task 10: CLOB mock 签名链路

**Files:**
- Create: `apps/api/src/orders/clob.client.ts`
- Create: `apps/api/src/orders/clob.mock.ts`
- Create: `apps/api/src/orders/signed-order.controller.ts`
- Create: `apps/api/src/orders/signed-order.service.ts`
- Create: `apps/api/src/orders/signed-order.service.spec.ts`
- Modify: `apps/web/src/features/orders/order-preview-panel.tsx`
- Modify: `apps/admin/src/views/PlaceholderView.vue`

- [ ] **Step 1: CLOB client 先走 mock**

真实 CLOB 环境变量未启用时，只允许 mock provider。

- [ ] **Step 2: 提交签名订单**

Endpoint:
- `POST /orders/signed`

必须校验：
- 签名地址等于绑定钱包
- order digest 等于预览返回的 digest
- preview 未过期
- manual gate 已确认

- [ ] **Step 3: 后台显示订单状态**

Orders 页显示：
- user
- market
- side
- price
- size
- status
- provider result
- failure reason

- [ ] **Step 4: 测试**

```bash
npm test --workspace @pmx/api
npm run test:e2e
```

Expected: 签名不匹配、预览过期、Gate 未确认都被拒绝。

**通过标准:** 用户签名订单能进入本地 DB 和 CLOB mock，状态可查。
**提交建议:** `feat: submit signed orders to clob mock`

---

## Task 11: 小额真实 CLOB 测试

**Files:**
- Modify: `apps/api/src/orders/clob.client.ts`
- Modify: `apps/api/src/orders/signed-order.service.ts`
- Modify: `apps/api/src/orders/signed-order.service.spec.ts`
- Modify: `docs/local-development.md`

- [ ] **Step 1: 启用真实 provider 开关**

必须通过环境变量显式开启：
- `CLOB_PROVIDER=real`
- `CLOB_API_BASE_URL`
- `CLOB_API_KEY`
- `MAX_REAL_ORDER_USD`

- [ ] **Step 2: 金额上限**

真实下单金额超过 `MAX_REAL_ORDER_USD` 必须拒绝。

- [ ] **Step 3: 小额测试**

只允许指定测试市场和指定金额上限。

- [ ] **Step 4: 测试**

```bash
npm test --workspace @pmx/api
npm run build
```

Expected: provider 开关、金额上限、禁用真实 provider 的测试都通过。

**通过标准:** 人工确认市场、金额、权限后，才能做一次真实小额链路测试。
**人工 Gate:** 没有明确 CLOB 权限和金额上限，不进入此阶段。
**提交建议:** `feat: gate real clob provider`

---

## Task 12: 撤单、成交、持仓同步

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/orders/order-sync.processor.ts`
- Create: `apps/api/src/orders/positions.service.ts`
- Create: `apps/api/src/orders/trades.service.ts`
- Modify: `apps/api/src/jobs/queue-names.ts`
- Modify: `apps/web/src/app/account/page.tsx`
- Modify: `apps/admin/src/views/PlaceholderView.vue`

- [ ] **Step 1: 增加订单状态同步**

BullMQ 定时同步：
- open
- matched
- partially matched
- canceled
- failed

- [ ] **Step 2: 增加撤单**

Endpoint:
- `POST /orders/:id/cancel`

- [ ] **Step 3: 增加成交和持仓查询**

Endpoints:
- `GET /orders`
- `GET /trades`
- `GET /positions`

- [ ] **Step 4: 测试**

```bash
npm run db:migrate
npm test --workspace @pmx/api
npm run test:e2e
```

Expected: 撤单、部分成交、失败重试、状态同步都有覆盖。

**通过标准:** 本地订单、成交、持仓状态和 CLOB 状态一致。
**提交建议:** `feat: sync orders trades and positions`

---

## Task 13: 风控与内测收口

**Files:**
- Create: `apps/api/src/compliance/geoblock.guard.ts`
- Create: `apps/api/src/compliance/rate-limit.guard.ts`
- Create: `apps/api/src/compliance/audit-log.service.ts`
- Create: `apps/api/src/compliance/audit-log.service.spec.ts`
- Modify: `apps/api/src/compliance/compliance.module.ts`
- Modify: `apps/admin/src/views/PlaceholderView.vue`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: geoblock**

受限地区用户不能预览和提交真实订单。

- [ ] **Step 2: rate limit**

关键接口限流：
- auth
- wallet signature
- deposit wallet creation
- order preview
- signed order submit

- [ ] **Step 3: audit log**

关键动作必须记录：
- login
- wallet bind
- deposit wallet create
- funding readiness view
- order preview
- signed order submit
- cancel order
- admin gate action

- [ ] **Step 4: Admin 审计页**

Audit/Risk 页面显示真实审计和风险事件。

- [ ] **Step 5: 测试**

```bash
npm test --workspace @pmx/api
npm run test:e2e
npm run build
```

Expected: 限流、受限地区、审计写入、后台读取都通过。

**通过标准:** 内测前关键动作有日志，受限操作被拦截，后台能排查失败原因。
**提交建议:** `feat: add compliance gates and audit logs`

---

## 每阶段统一验收

每个阶段完成后都必须跑：

```bash
npm run build
npm test
npm run test:e2e
```

每个阶段完成后都必须浏览器检查：

| 页面 | 检查 |
|---|---|
| `http://localhost:3000` | Web 首页和核心交互 |
| `http://localhost:3001/#/dashboard` | Admin 登录态、菜单、页面数据 |
| `http://localhost:4000/health` | API 健康状态 |

每个阶段完成后都必须确认：
- 没有破坏注册、登录、账户页。
- 普通 USER 不能进 Admin。
- ADMIN 能进 Admin 并看到真实数据。
- 真实交易提交默认关闭。
- 真实 CLOB provider 没有人工确认前不能启用。

---

## 人工 Gate

| Gate | 触发点 | 必须确认 |
|---|---|---|
| G1 | 接完整官方 Vben v5 monorepo 前 | 是否接受 pnpm/monorepo 迁移成本 |
| G2 | 接真实 Polymarket API 前 | 市场字段、展示口径、失败重试策略 |
| G3 | 钱包连接上线前 | 支持的钱包、链、RPC 服务商 |
| G4 | Deposit Wallet 调真实 API 前 | Relayer/Builder/CLOB 权限和调用方式 |
| G5 | 入金引导上线前 | 地区限制、风险提示、入金文案 |
| G6 | 真实订单提交前 | 人工确认文案、金额上限、测试市场 |
| G7 | 小额真实交易前 | CLOB 权限、金额上限、失败处理预案 |
| G8 | 内测前 | 内测名单、日志保留、风控规则 |

---

## 推荐最近三步

| 顺序 | 任务 | 原因 | 验收 |
|---:|---|---|---|
| 1 | Task 1 文档校准 | 旧文档已经和实际代码不一致，继续开发前先统一口径 | `docs` 中文正常、内容准确 |
| 2 | Task 2 Admin 正式 Vben 化 | 后台是后续市场、订单、审计、风险的入口 | Admin 登录、权限、菜单、用户页通过 |
| 3 | Task 4 Web Product Design 交易工作台 | 先让用户工作台形态正确，再接真实市场数据 | Playwright 验证核心布局和状态 |
