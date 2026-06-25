# PMX CLOB V2 Order Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前“可点击、可预览”的投注路径升级成官方 Polymarket CLOB V2 对齐的 Order Router 基础闭环，但真实 CLOB 提交仍由人工 Gate 控制。

**Architecture:** Web 继续只负责交易意图、钱包签名和状态展示；API 负责订单预览、签名载荷校验、CLOB provider 路由、审计和状态同步。订单模型统一使用 Polymarket CLOB V2 字段：`tokenID`、`side`、`orderType`、`tickSize`、`negRisk`、`builderCode`、`signatureType`、`funderAddress`。

**Tech Stack:** Next.js, React, TypeScript, NestJS, Prisma, PostgreSQL, BullMQ, Redis, `@polymarket/clob-client-v2`, `viem`, Vitest, Jest, Playwright.

---

## Scope

| 项目 | 决策 |
|---|---|
| 本阶段目标 | 完成真实交易前的 Order Router、签名校验、mock submit、builder attribution、状态同步基础 |
| 真实 CLOB | 默认关闭；只在最后一个任务用 `CLOB_PROVIDER=real`、金额上限和人工 Gate 做小额测试 |
| 钱包 | 只做 non-custodial EOA 绑定、Deposit Wallet 状态、pUSD balance/allowance 检查 |
| UI | 不做装饰性重设计；只改交易所必需的状态、按钮和错误展示 |
| 不做 | 托管钱包、自动入金、自动授权、复杂盘口深度图、绕过地区/风控限制 |

## File Map

| 文件 | 职责 |
|---|---|
| `apps/api/prisma/schema.prisma` | 补齐 Order / Trade / Position / Wallet 的 CLOB V2 字段 |
| `apps/api/src/orders/orders.service.ts` | 订单预览、签名订单校验、状态写入 |
| `apps/api/src/orders/orders.controller.ts` | `/orders/preview`、`/orders/signed`、`/orders/:id/cancel`、`/orders` |
| `apps/api/src/orders/clob-provider.ts` | provider interface，隔离 mock / real |
| `apps/api/src/orders/clob-mock.provider.ts` | 默认 mock submit / cancel / status |
| `apps/api/src/orders/clob-real.provider.ts` | 官方 CLOB V2 SDK adapter，默认不启用 |
| `apps/api/src/orders/order-sync.processor.ts` | 后续同步 open orders / trades / positions |
| `apps/api/src/wallets/*` | EOA 绑定、Deposit Wallet、pUSD balance、allowance |
| `apps/web/src/features/trading/*` | 订单票据、API preview、签名确认、错误展示 |
| `apps/web/src/features/wallet/*` | 钱包连接、签名证明、Deposit Wallet 状态 |
| `apps/admin/src/views/PlaceholderView.vue` | Admin Orders / Risk / Markets 的 Gate 和同步状态 |

---

## Task 1: CLOB V2 Domain Model

**目标:** 数据库和 API 类型先完整表达官方 CLOB V2 订单字段，避免继续用 Yes/No 本地模型冒充真实交易模型。

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_extend_order_clob_v2_fields/migration.sql`
- Create: `apps/api/src/orders/order-domain.ts`
- Test: `apps/api/src/orders/order-domain.spec.ts`

**Steps:**

- [ ] 写失败测试：`toClobOrderDraft` 必须输出 `tokenID`、`side: BUY`、`orderType: FAK`、`tickSize`、`negRisk`、`builderCode`、`signatureType: POLY_1271`。
- [ ] 运行：`npm run test --workspace @pmx/api -- order-domain.spec.ts`，预期失败：模块不存在。
- [ ] 增加 `order-domain.ts`，定义 `ClobOrderDraft`、`OrderReadinessGate`、`BuilderAttributionStatus`。
- [ ] 扩展 Prisma `Order`：`tokenId`、`outcome`、`orderType`、`builderCode`、`funderAddress`、`signatureType`、`rawPreview`、`rawSignedOrder`、`clobStatus`、`failureReason`。
- [ ] 运行：`npm run prisma:generate --workspace @pmx/api`。
- [ ] 运行：`npm run test --workspace @pmx/api -- order-domain.spec.ts`，预期通过。

**验收标准:**

- `Order` 表能保存 CLOB V2 draft 和 signed payload。
- 测试断言订单草稿没有旧 V1 字段依赖。
- `npm run build --workspace @pmx/api` 通过。

---

## Task 2: Order Preview API Hardening

**目标:** `/orders/preview` 从“能返回草稿”升级成“能完整校验交易前置条件”。

**Files:**
- Modify: `apps/api/src/orders/orders.service.ts`
- Modify: `apps/api/src/orders/dto/preview-order.dto.ts`
- Test: `apps/api/src/orders/orders.service.spec.ts`

**Steps:**

- [ ] 写失败测试：低于 `minOrderSize` 的金额返回 `BadRequestException`。
- [ ] 写失败测试：缺少 `builderCode` 时 response 标记 `builderAttributionStatus: MISSING`，但不允许进入 signed submit。
- [ ] 写失败测试：closed market、missing quote、invalid tick size、invalid amount 都返回明确错误。
- [ ] 实现 preview 校验：quote price 优先 `bestAsk`，没有才用 `midpoint`；校验 `tokenId`、`tickSize`、`negRisk`。
- [ ] 保存 `PREVIEWED` 订单记录，`rawPreview` 内保存 `clob` draft。
- [ ] 运行：`npm run test --workspace @pmx/api -- orders.service.spec.ts`。

**验收标准:**

- `POST /orders/preview` 返回可签名前的完整 draft。
- 预览记录写入数据库，Admin `ordersPreviewed` 计数增加。
- 真实提交仍然 disabled，且 response 中有 `submitDisabledReason`。

---

## Task 3: Wallet And Deposit Readiness

**目标:** 建立真实下单前的 non-custodial 钱包状态，不处理托管资金。

**Files:**
- Create: `apps/api/src/wallets/wallet-proof.controller.ts`
- Create: `apps/api/src/wallets/wallet-proof.service.ts`
- Create: `apps/api/src/wallets/deposit-wallet.service.ts`
- Create: `apps/api/src/wallets/balance-allowance.service.ts`
- Modify: `apps/api/src/wallets/wallets.module.ts`
- Create: `apps/web/src/features/wallet/wallet-client.ts`
- Create: `apps/web/src/features/wallet/wallet-panel.tsx`
- Test: `apps/api/src/wallets/*.spec.ts`
- Test: `apps/web/src/features/wallet/*.test.tsx`

**Steps:**

- [ ] 写失败测试：`POST /wallets/nonce` 返回一次性 nonce。
- [ ] 写失败测试：`POST /wallets/verify` 校验 EOA 签名后保存 `Wallet(type=EOA)`。
- [ ] 写失败测试：`GET /wallets/deposit` 在未接 relayer 时返回 `NOT_CREATED`，不创建真实钱包。
- [ ] 写失败测试：`GET /wallets/balance-allowance` 返回 pUSD balance / allowance / region gate 的 mock 状态。
- [ ] 实现 API 和 Web panel。
- [ ] Account 页改为读取 API 钱包状态，不只写死“未连接”。

**验收标准:**

- 绑定钱包后 `/auth/me` 或账户页能显示 EOA 地址。
- 未创建 Deposit Wallet 时，下单签名按钮 disabled。
- balance / allowance 未通过时，`POST /orders/preview` 仍可用，但 `POST /orders/signed` 不可用。

---

## Task 4: Signed Order Mock Submit

**目标:** 在不触碰真实 CLOB 的情况下，把“用户签名后提交订单”链路跑通到本地数据库和 Admin。

**Files:**
- Create: `apps/api/src/orders/dto/signed-order.dto.ts`
- Create: `apps/api/src/orders/clob-provider.ts`
- Create: `apps/api/src/orders/clob-mock.provider.ts`
- Modify: `apps/api/src/orders/orders.service.ts`
- Modify: `apps/api/src/orders/orders.controller.ts`
- Test: `apps/api/src/orders/signed-order.service.spec.ts`
- Test: `tests/e2e/market-detail.spec.ts`

**Steps:**

- [ ] 写失败测试：没有 preview id 的 signed submit 返回 `NotFoundException`。
- [ ] 写失败测试：signed payload 的 `tokenID/price/amount/builderCode` 与 preview 不一致时拒绝。
- [ ] 写失败测试：wallet/deposit/balance/allowance/region 任一 Gate 未通过时拒绝。
- [ ] 实现 `ClobProvider` interface：`submitSignedOrder`、`cancelOrder`、`getOrder`。
- [ ] 实现 mock provider，返回 deterministic `mock_clob_order_id`。
- [ ] `POST /orders/signed` 只调用 mock provider，写入 `SIGNED` / `SUBMITTED` / `OPEN` 状态。

**验收标准:**

- `CLOB_PROVIDER` 默认值为 `mock`。
- 未设置 `CLOB_PROVIDER=real` 时，任何路径都不会调用真实 CLOB。
- Admin Orders 能看到 mock 订单状态和 failure reason。

---

## Task 5: Real CLOB Adapter Behind Manual Gate

**目标:** 准备官方 SDK adapter，但不默认启用。

**Files:**
- Create: `apps/api/src/orders/clob-real.provider.ts`
- Create: `apps/api/src/orders/clob-config.ts`
- Test: `apps/api/src/orders/clob-real.provider.spec.ts`

**Steps:**

- [ ] 写失败测试：缺少 `CLOB_API_KEY`、`CLOB_SECRET`、`CLOB_PASS_PHRASE`、`POLYMARKET_BUILDER_CODE` 时 provider 初始化失败。
- [ ] 写失败测试：`CLOB_PROVIDER=real` 但 `REAL_CLOB_MANUAL_GATE` 不是 `enabled` 时拒绝启动或拒绝 submit。
- [ ] 实现 SDK adapter，调用 `ClobClient.postOrder` / `cancelOrder` / `getOrder`。
- [ ] 保留 `throwOnError: true`，把 SDK error 转成可记录的 `failureReason`。

**验收标准:**

- `npm test` 能证明 real provider 没有配置时不会误启用。
- `CLOB_PROVIDER=real` 必须同时满足人工 Gate 和 API credentials。
- 每次真实 submit 前必须记录 market、tokenID、amount、maxUsd、builderCode。

---

## Task 6: Builder Attribution Tracking

**目标:** 每笔订单都能证明 builder attribution 是否生效，并能查询 builder trades。

**Files:**
- Modify: `apps/api/src/orders/orders.service.ts`
- Create: `apps/api/src/orders/builder-trades.service.ts`
- Modify: `apps/admin/src/views/PlaceholderView.vue`
- Test: `apps/api/src/orders/builder-trades.service.spec.ts`

**Steps:**

- [ ] 写失败测试：preview 和 signed submit 都必须保存 `builderCode`。
- [ ] 写失败测试：缺少 builder code 时 Admin Gate 显示 `BLOCKED`。
- [ ] 实现 `getBuilderTrades(builderCode)`，底层使用 CLOB V2 builder trades API。
- [ ] Admin Markets / Orders 显示 builder attribution 状态。

**验收标准:**

- 设置 `POLYMARKET_BUILDER_CODE=0x...` 后，预览和提交记录都保存相同 builder code。
- Admin 显示 `builderAttributionStatus: CONFIGURED`。
- 可按 builder code 查询 trade 列表，失败时显示 CLOB 返回原因。

---

## Task 7: Portfolio, Orders, Trades Sync

**目标:** 用户账户和 Portfolio 不再只看 localStorage activity，而是读取后端订单、成交和持仓。

**Files:**
- Create: `apps/api/src/orders/order-sync.processor.ts`
- Create: `apps/api/src/orders/positions.service.ts`
- Create: `apps/api/src/orders/trades.service.ts`
- Modify: `apps/web/src/app/portfolio/page.tsx`
- Modify: `apps/web/src/features/auth/account-panel.tsx`
- Test: `apps/api/src/orders/order-sync.processor.spec.ts`
- Test: `tests/e2e/account.spec.ts`

**Steps:**

- [ ] 写失败测试：mock order open 后，Portfolio 显示 open order。
- [ ] 写失败测试：mock fill 后，Position 使用 average price 更新。
- [ ] 实现订单状态同步 job。
- [ ] Account 页最近订单从 API 读取，localStorage 只作为未登录浏览记录。

**验收标准:**

- 登录用户能在 `/portfolio` 看到订单和持仓。
- 订单状态和 CLOB/mock provider 返回状态一致。
- 同步失败会进入 `failureReason`，Admin 可见。

---

## Task 8: Small Real Trade Acceptance Gate

**目标:** 只在人工确认后做一笔极小金额真实交易验证。

**Files:**
- Create: `tests/e2e/real-clob-smoke.spec.ts`
- Modify: `docs/local-development.md`
- Modify: `docs/architecture.md`

**Steps:**

- [ ] 增加 `REAL_CLOB_MAX_USD`，默认 `0`。
- [ ] 真实 smoke test 必须检测 `RUN_REAL_CLOB_TESTS=1`，否则 skip。
- [ ] 测试流程：preview -> sign -> submit -> verify order id -> cancel -> verify cancelled。
- [ ] 文档写明测试市场、金额上限、失败处理和回滚步骤。

**验收标准:**

- 默认 `npm run test:e2e` 不跑真实 CLOB。
- 只有 `RUN_REAL_CLOB_TESTS=1 CLOB_PROVIDER=real REAL_CLOB_MANUAL_GATE=enabled REAL_CLOB_MAX_USD=1` 时才允许真实测试。
- 真实测试完成后必须能 cancel 或确认订单已成交；结果写入 Admin / Audit。

---

## Final Verification

必须全部通过：

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

真实 CLOB 小额测试单独执行，默认跳过：

```bash
RUN_REAL_CLOB_TESTS=1 CLOB_PROVIDER=real REAL_CLOB_MANUAL_GATE=enabled REAL_CLOB_MAX_USD=1 npm run test:e2e -- real-clob-smoke.spec.ts
```

## Acceptance Checklist

- [ ] `npm ls @polymarket/clob-client-v2 viem --workspace @pmx/api` 能看到已安装依赖。
- [ ] `/orders/preview` 返回 `tokenID`、`side`、`orderType`、`tickSize`、`negRisk`、`signatureType`、`builderCode`、`submitDisabledReason`。
- [ ] 预览订单会写入 `Order(status=PREVIEWED)`。
- [ ] 没有 EOA wallet、Deposit Wallet、pUSD balance、allowance、region gate 时，`POST /orders/signed` 必须拒绝。
- [ ] `CLOB_PROVIDER=mock` 时 signed submit 能写入本地订单状态，不调用真实 CLOB。
- [ ] `CLOB_PROVIDER=real` 缺任一必要配置时真实 provider 不可用。
- [ ] `REAL_CLOB_MANUAL_GATE` 未启用时真实 submit 不可执行。
- [ ] builder code 写入 preview、signed payload、submitted order，并能在 Admin 看到。
- [ ] Portfolio 和 Account 从后端读取订单/持仓状态。
- [ ] Admin Orders / Risk 能显示失败原因、最近同步时间、真实 CLOB Gate 状态。
- [ ] 默认 E2E 不依赖真实钱包和真实 CLOB。
- [ ] 小额真实交易只在显式环境变量和人工 Gate 下运行。

## Recommended Execution Order

| 顺序 | 任务 | 原因 |
|---:|---|---|
| 1 | Task 1-2 | 先把订单模型和 preview 变成官方 CLOB V2 草稿 |
| 2 | Task 3 | 没有钱包和 Deposit 状态，不应该进入签名 |
| 3 | Task 4 | 先 mock submit，验证 Router 和 DB 状态机 |
| 4 | Task 5-6 | 接真实 SDK adapter 和 builder attribution，但仍不默认启用 |
| 5 | Task 7 | 订单、成交、持仓进入用户侧闭环 |
| 6 | Task 8 | 最后做人工 Gate 下的小额真实测试 |

## Current Known Risk

| 风险 | 等级 | 处理 |
|---|---:|---|
| `prisma generate` 在 Windows 上会被运行中的 API dev 占用 DLL | 中 | 生成前临时停止 API dev，生成后重启 |
| `npm audit` 仍有依赖风险提示 | 中 | 单独安排依赖审计任务，不和交易链路混做 |
| 官方 TS SDK 仍在变化 | 中 | 真实下单优先使用 `@polymarket/clob-client-v2` 的稳定字段 |
| 真实 CLOB 受地区、余额、权限影响 | 高 | 不进入默认验收，只作为显式人工 Gate smoke test |
