# PMX Next Work Acceptance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前已跑通的市场行情基础，升级成用户能理解、能点击、能预览投注路径的交易工作台，但继续禁止真实 CLOB 下单。

**Architecture:** 前台继续使用 Next.js + React + TypeScript，围绕市场列表、市场详情、订单票据、账户中心、活动记录做交互闭环。后端继续使用 NestJS + Prisma + PostgreSQL + Redis，当前阶段只提供只读市场行情和订单预览记录能力，不接真实交易提交。

**Tech Stack:** Next.js, React, TypeScript, Vitest, Playwright, NestJS, Prisma, PostgreSQL, Redis, Polymarket Gamma API, Polymarket CLOB books API.

---

## Current Baseline

| 项目 | 当前状态 |
|---|---|
| Web | `http://localhost:3000` 可访问 |
| Admin | `http://localhost:3001` 可访问 |
| API | `http://localhost:4000/health` 可访问 |
| DB/Redis | PostgreSQL 和 Redis 已通过 Docker Compose 运行 |
| 市场数据 | 已能同步 50 个市场和 100 条盘口行情 |
| 交易状态 | 只允许订单预览，不允许真实 CLOB 提交 |
| 代码状态 | 最近提交 `06277a1 Add Polymarket market quote sync` 已推送 |

---

## Out Of Scope

| 不做 | 原因 |
|---|---|
| 真实 CLOB 下单 | 钱包、签名、地区限制、余额和风控 Gate 还没完整闭环 |
| 钱包托管 | 产品方向是 non-custodial |
| 装饰性动态 UI | 用户已明确不需要国旗轮转、金额飘动这类展示大于实用的组件 |
| 自动入金/授权 | 后续钱包和 Deposit Wallet 阶段再做 |
| 复杂盘口深度图 | 当前优先做可理解的投注交互和预览 |

---

## Task 1: 市场详情页改成可用投注页面

**目标:** 点击市场或盘口后进入市场详情页，页面结构参考 Polymarket 的实际投注流程，但保持静态、克制、实用。

**Files:**
- Modify: `apps/web/src/features/markets/market-detail-page.tsx`
- Modify: `apps/web/src/features/trading/order-ticket.tsx`
- Modify: `apps/web/src/app/globals.css`
- Test: `tests/e2e/market-detail.spec.ts`

**实现细则:**
- 市场详情页顶部显示市场标题、状态、成交量、流动性、最后同步时间。
- 中间显示 Yes / No 或多 outcome 的盘口按钮。
- 右侧固定订单票据，点击不同 outcome 后票据同步变化。
- 订单票据包含：买入方向、价格、金额输入、份数、预计成本、预计返还、预计收益、不可提交状态、人工确认 Gate。
- 不做国旗轮转、金额飘动、装饰性动画。

**验收标准:**
- 从首页点击任意市场卡片进入 `/markets/<marketId>`。
- 点击 Yes / No 盘口后，右侧订单票据的 outcome、价格、份数、收益实时更新。
- 输入 `$10` 时，份数和预计返还按真实盘口价格计算。
- “人工确认 Gate” 按钮保持 disabled，不能提交真实订单。
- E2E 覆盖：进入详情页、切换盘口、输入金额、确认 Gate 禁用。

---

## Task 2: 订单预览交互补全

**目标:** 用户能清楚看到“如果下这笔单，会发生什么”，但系统不提交真实订单。

**Files:**
- Modify: `apps/web/src/features/trading/order-calculator.ts`
- Modify: `apps/web/src/features/trading/order-calculator.test.ts`
- Modify: `apps/web/src/features/trading/order-ticket.tsx`
- Modify: `apps/web/src/features/trading/order-ticket.test.tsx`
- Modify: `apps/web/src/features/activity/activity-store.ts`

**实现细则:**
- 支持金额输入、快捷金额按钮：`$1`、`$5`、`$10`、`$25`、`$50`。
- 计算字段固定为：价格、份数、预计成本、预计返还、预计收益。
- 输入非法金额时显示 0 值，不报错、不崩溃。
- 每次有效订单预览写入本地 activity：市场、方向、价格、金额、时间。

**验收标准:**
- 单元测试覆盖价格为 `0`、`0.25`、`1`、非法金额四种情况。
- 切换快捷金额后，订单票据即时更新。
- Activity 页面能看到最近一次订单预览记录。
- 真实 CLOB 提交仍不可用。

---

## Task 3: 账户中心补齐用户视角

**目标:** 账户页不再只显示邮箱，要让用户看到自己当前离真实交易还差哪些步骤。

**Files:**
- Modify: `apps/web/src/app/account/page.tsx`
- Modify: `apps/web/src/features/auth/account-panel.tsx`
- Modify: `apps/web/src/features/auth/account-panel.test.tsx`
- Modify: `apps/web/src/features/i18n/messages.ts`
- Test: `tests/e2e/home.spec.ts` or create `tests/e2e/account.spec.ts`

**实现细则:**
- 显示账户邮箱、角色、登录状态。
- 显示钱包状态：未连接。
- 显示 Deposit Wallet 状态：未创建。
- 显示资金/授权状态：未检查。
- 显示风控状态：真实交易关闭，仅可预览。
- 显示最近订单预览记录，来自本地 activity。

**验收标准:**
- 登录普通用户后进入 `/account`，能看到邮箱和角色。
- 页面显示钱包、Deposit Wallet、资金授权、风控四个状态卡。
- 如果刚做过订单预览，账户页能看到对应记录。
- 未登录访问账户页时提示先登录。
- 中文/英文切换后，账户页文案同步切换。

---

## Task 4: 后台市场同步页增强

**目标:** 管理后台能清楚显示市场同步和盘口行情同步状态，方便判断数据是否正常。

**Files:**
- Modify: `apps/admin/src/views/PlaceholderView.vue`
- Modify: `apps/admin/src/api/admin.ts`
- Modify: `apps/api/src/admin/admin.service.ts`
- Modify: `apps/api/src/admin/admin.service.spec.ts`
- Modify: `tests/e2e/admin.spec.ts`

**实现细则:**
- 后台 Markets 页显示：市场总数、行情总数、最近市场同步时间、最近盘口同步时间。
- 手动同步后显示：市场成功/失败数量、盘口成功/失败数量。
- 同步失败时显示失败原因。
- 不让普通 USER 进入后台。

**验收标准:**
- `admin@pmx.local` 登录后台后能打开 Markets 页面。
- 点击同步后页面显示 `市场 50/0，行情 100/0` 这类结果。
- 后台 Dashboard 能看到 `marketQuotesSynced`。
- 普通用户登录后台仍被拒绝。

---

## Task 5: 市场行情展示细节

**目标:** 用户能知道价格来自真实同步，而不是静态假数据。

**Files:**
- Modify: `apps/web/src/features/markets/markets-client.ts`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/features/markets/market-detail-page.tsx`
- Modify: `apps/web/src/features/markets/market-localization.ts`
- Modify: `apps/web/src/features/markets/market-localization.test.ts`

**实现细则:**
- 市场卡片显示最后同步时间。
- 价格优先使用 CLOB quote 的 `bestAsk` / `midpoint`，没有 quote 时才回落到 Gamma `outcomePrices`。
- 中文词典继续扩展体育、政治、加密、宏观等常见市场词。
- 保留原始英文市场标题作为英文模式展示。

**验收标准:**
- 首页市场卡片显示同步时间。
- 对有 quote 的市场，价格来自 quote。
- 中文模式下常见市场标题和 outcome 能翻译。
- 英文模式下保持英文原文。

---

## Task 6: 完整验证和提交

**Files:**
- Test: `apps/web/src/**/*.test.ts`
- Test: `apps/web/src/**/*.test.tsx`
- Test: `apps/api/src/**/*.spec.ts`
- Test: `tests/e2e/*.spec.ts`

**验收命令:**

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

**浏览器验收:**

| 地址 | 验收 |
|---|---|
| `http://localhost:3000` | 市场列表、筛选、盘口入口正常 |
| `http://localhost:3000/markets/<marketId>` | 市场详情和订单票据可交互 |
| `http://localhost:3000/account` | 登录用户能看到完整账户状态 |
| `http://localhost:3001` | 管理后台能登录并查看市场同步 |
| `http://localhost:4000/health` | API 正常 |

**提交标准:**
- 所有测试和构建通过。
- Git 工作区只包含本批任务改动。
- commit message 使用：`Improve PMX market detail and account flows`。
- push 到当前分支：`codex/local-control-loop-i18n-admin-zh`。
