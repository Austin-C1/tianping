# PMX Wallet Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立真实下单前的 non-custodial wallet readiness：EOA 绑定证明、Deposit Wallet 状态、pUSD balance/allowance gate，并把这些状态接入账户页和订单预览。

**Architecture:** Web 只请求钱包连接和用户签名，不保存私钥；API 负责 nonce、签名校验、Wallet 持久化、Deposit Wallet 状态和交易 Gate 汇总。当前阶段不创建真实 Deposit Wallet、不做授权交易、不提交 signed order，只把真实交易前置条件变成可验证状态。

**Tech Stack:** Next.js, React, TypeScript, NestJS, Prisma, PostgreSQL, `viem`, Jest, Vitest, Playwright.

---

## Scope

| 项目 | 决策 |
|---|---|
| 做 | EOA wallet 绑定、签名 nonce、Deposit Wallet mock/readiness、pUSD balance/allowance mock 状态、账户页状态读取、订单 preview gate |
| 不做 | 托管钱包、真实 Deposit Wallet 创建、真实 pUSD 授权、真实 CLOB signed submit |
| 默认状态 | 没有绑定钱包时，订单仍可 preview，但不可进入 signed submit |
| 安全边界 | API 不接触用户私钥，不代签；所有签名都来自浏览器钱包 |

## File Map

| 文件 | 职责 |
|---|---|
| `apps/api/prisma/schema.prisma` | 增加 `WalletChallenge`，支持 nonce、过期、消费状态 |
| `apps/api/src/wallets/wallet-proof.service.ts` | 生成 nonce、校验 EOA signature、upsert Wallet |
| `apps/api/src/wallets/wallet-proof.controller.ts` | `POST /wallets/nonce`、`POST /wallets/verify` |
| `apps/api/src/wallets/wallet-readiness.service.ts` | 汇总 EOA、Deposit Wallet、pUSD balance、allowance、region gate |
| `apps/api/src/wallets/wallets.controller.ts` | `GET /wallets/me`、`GET /wallets/deposit`、`GET /wallets/balance-allowance` |
| `apps/api/src/orders/orders.service.ts` | preview response 增加 readiness gates |
| `apps/web/src/features/wallet/wallet-client.ts` | 前端钱包 API client |
| `apps/web/src/features/wallet/wallet-panel.tsx` | 账户页钱包状态面板 |
| `apps/web/src/features/auth/account-panel.tsx` | 接入 API 钱包状态，替换硬编码状态 |
| `apps/web/src/features/trading/order-preview-client.ts` | 展示 preview readiness gates |
| `tests/e2e/account.spec.ts` | 登录账户页显示 wallet readiness |

---

## Task 1: Wallet Challenge Data Model

**目标:** API 能为登录用户生成一次性签名挑战，后续验证钱包归属。

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_wallet_challenges/migration.sql`
- Create: `apps/api/src/wallets/wallet-proof.service.spec.ts`
- Create: `apps/api/src/wallets/wallet-proof.service.ts`

**Steps:**

- [ ] 写失败测试：`createChallenge({ userId })` 返回 `nonce`、`message`、`expiresAt`，并写入 `walletChallenge.create`。

```ts
await expect(service.createChallenge({ userId: "user_1" })).resolves.toMatchObject({
  message: expect.stringContaining("PMX wallet binding"),
  nonce: expect.any(String),
  expiresAt: expect.any(Date)
});
expect(prisma.walletChallenge.create).toHaveBeenCalledWith({
  data: expect.objectContaining({
    userId: "user_1",
    nonce: expect.any(String),
    message: expect.stringContaining("PMX wallet binding")
  })
});
```

- [ ] 运行：`npm run test --workspace @pmx/api -- wallet-proof.service.spec.ts`，预期失败：service 不存在。
- [ ] 增加 Prisma model：

```prisma
model WalletChallenge {
  id         String    @id @default(cuid())
  userId     String
  nonce      String    @unique
  message    String
  address    String?
  chainId    Int?
  expiresAt  DateTime
  consumedAt DateTime?
  createdAt  DateTime  @default(now())
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([expiresAt])
}
```

- [ ] 给 `User` 增加 `walletChallenges WalletChallenge[]` relation。
- [ ] 实现 `WalletProofService.createChallenge`，nonce 使用 `crypto.randomUUID()`，过期时间为 10 分钟。
- [ ] 运行：`npm run prisma:generate --workspace @pmx/api`。
- [ ] 运行：`npm run test --workspace @pmx/api -- wallet-proof.service.spec.ts`，预期通过。

**验收标准:**

- 同一 nonce 只能存在一条 challenge。
- challenge 有明确过期时间。
- API 测试证明 challenge 写入数据库。

---

## Task 2: EOA Signature Verification

**目标:** 用户用浏览器钱包签名后，API 能验证签名并保存 `Wallet(type=EOA)`。

**Files:**
- Modify: `apps/api/src/wallets/wallet-proof.service.ts`
- Create: `apps/api/src/wallets/dto/create-wallet-challenge.dto.ts`
- Create: `apps/api/src/wallets/dto/verify-wallet.dto.ts`
- Modify: `apps/api/src/wallets/wallet-proof.service.spec.ts`

**Steps:**

- [ ] 写失败测试：用 `viem/accounts` 生成测试 account，签名 challenge message，`verifyWallet` 后 upsert EOA wallet。

```ts
const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945387d863a4e64a88c8f1f1d5d8b0f0000001");
const signature = await account.signMessage({ message: "PMX wallet binding\nNonce: nonce_1" });
await expect(service.verifyWallet({
  address: account.address,
  chainId: 137,
  nonce: "nonce_1",
  signature
}, { userId: "user_1" })).resolves.toMatchObject({
  address: account.address,
  chainId: 137,
  status: "CONNECTED"
});
```

- [ ] 写失败测试：过期 challenge、已消费 challenge、签名地址不匹配都拒绝。
- [ ] 实现 `verifyWallet`：读取 challenge，校验 `expiresAt > now`、`consumedAt === null`，使用 `verifyMessage` 校验签名。
- [ ] 成功后 `wallet.upsert({ where: { userId_type_address_chainId } })` 保存 EOA wallet。
- [ ] 成功后更新 challenge `consumedAt`、`address`、`chainId`。
- [ ] 运行：`npm run test --workspace @pmx/api -- wallet-proof.service.spec.ts`。

**验收标准:**

- 错误签名不能绑定钱包。
- 同一个 challenge 不能重复使用。
- 绑定成功后 `Wallet` 表出现 `type=EOA`、`address`、`chainId`。

---

## Task 3: Wallet API Routes

**目标:** 前端可以通过认证 API 完成 nonce 获取、签名验证和钱包状态读取。

**Files:**
- Create: `apps/api/src/wallets/wallet-proof.controller.ts`
- Create: `apps/api/src/wallets/wallet-readiness.service.ts`
- Modify: `apps/api/src/wallets/wallets.module.ts`
- Create: `apps/api/src/wallets/wallet-proof.controller.spec.ts`
- Create: `apps/api/src/wallets/wallet-readiness.service.spec.ts`

**Steps:**

- [ ] 写 controller 测试：`POST /wallets/nonce` 必须要求 AuthGuard，并调用 `createChallenge(request.user)`。
- [ ] 写 controller 测试：`POST /wallets/verify` 必须调用 `verifyWallet(dto, request.user)`。
- [ ] 写 readiness 测试：没有 wallet 时返回：

```ts
{
  eoa: { status: "NOT_CONNECTED", address: null },
  depositWallet: { status: "NOT_CREATED", address: null },
  funding: { status: "NOT_CHECKED", pUsdBalance: null, allowance: null },
  region: { status: "NOT_CHECKED" },
  canPreview: true,
  canSign: false
}
```

- [ ] 实现 controller routes：`POST /wallets/nonce`、`POST /wallets/verify`、`GET /wallets/me`、`GET /wallets/deposit`、`GET /wallets/balance-allowance`。
- [ ] 运行：`npm run test --workspace @pmx/api -- wallets` 或相关 spec 文件。

**验收标准:**

- 未登录访问钱包 API 返回 401。
- 登录后能获取 nonce。
- 登录后能读取统一 readiness 状态。

---

## Task 4: Order Preview Readiness Gates

**目标:** `/orders/preview` 返回交易前置 gate，让前端明确知道为什么不能签名下单。

**Files:**
- Modify: `apps/api/src/orders/orders.service.ts`
- Modify: `apps/api/src/orders/orders.service.spec.ts`
- Modify: `apps/api/src/orders/orders.module.ts`

**Steps:**

- [ ] 写失败测试：没有 EOA wallet 时 preview 返回 `readinessGates`，其中 `wallet-binding` 为 `PENDING`，`canSign: false`。
- [ ] 写失败测试：有 EOA 但没有 Deposit Wallet 时，`deposit-wallet` 为 `PENDING`。
- [ ] 将 `WalletReadinessService` 注入 `OrdersService`。
- [ ] preview response 增加：

```ts
readiness: {
  canPreview: true,
  canSign: false,
  gates: [
    { key: "wallet-binding", status: "PENDING", reason: "EOA wallet is not connected" },
    { key: "deposit-wallet", status: "PENDING", reason: "Deposit Wallet is not created" },
    { key: "funding-allowance", status: "PENDING", reason: "pUSD balance and allowance are not checked" },
    { key: "region-risk", status: "PENDING", reason: "Region risk check is not complete" }
  ]
}
```

- [ ] 运行：`npm run test --workspace @pmx/api -- orders.service.spec.ts wallet-readiness.service.spec.ts`。

**验收标准:**

- Preview 不被 wallet gate 阻塞。
- Signed submit 的前置条件能从同一 readiness service 复用。
- response 明确写出 `canSign: false` 和原因。

---

## Task 5: Web Wallet Client And Account Panel

**目标:** 账户页不再只显示硬编码钱包状态，而是读取 API readiness，并支持发起钱包绑定。

**Files:**
- Create: `apps/web/src/features/wallet/wallet-client.ts`
- Create: `apps/web/src/features/wallet/wallet-client.test.ts`
- Create: `apps/web/src/features/wallet/wallet-panel.tsx`
- Create: `apps/web/src/features/wallet/wallet-panel.test.tsx`
- Modify: `apps/web/src/features/auth/account-panel.tsx`
- Modify: `apps/web/src/features/auth/account-panel.test.tsx`

**Steps:**

- [ ] 写 client 测试：`getWalletReadiness()` 带 bearer token 请求 `/wallets/me`。
- [ ] 写 client 测试：无 token 时返回 `null`，不请求 API。
- [ ] 写 panel 测试：未连接显示 `Not connected / 未连接`，已连接显示 address 和 chainId。
- [ ] 实现 `wallet-client.ts`。
- [ ] 实现 `WalletPanel`：读取 readiness，显示 wallet、Deposit Wallet、funding、region 四块状态。
- [ ] 将 `AccountPanel` 的钱包状态卡替换为 `WalletPanel`。
- [ ] 运行：`npm run test --workspace @pmx/web -- wallet-client.test.ts wallet-panel.test.tsx account-panel.test.tsx`。

**验收标准:**

- 登录账户页展示 API readiness。
- 未登录账户页仍提示先登录。
- API 失败时显示可理解的失败状态，不崩溃。

---

## Task 6: Browser Wallet Binding Flow

**目标:** 浏览器里有 `window.ethereum` 时，用户可点击绑定钱包完成 nonce 签名。

**Files:**
- Modify: `apps/web/src/features/wallet/wallet-panel.tsx`
- Modify: `apps/web/src/features/wallet/wallet-panel.test.tsx`
- Test: `tests/e2e/account.spec.ts`

**Steps:**

- [ ] 写组件测试：点击“Connect wallet / 连接钱包”后调用 `eth_requestAccounts`。
- [ ] 写组件测试：拿到 address 后请求 nonce，再调用 `personal_sign`，最后请求 `/wallets/verify`。
- [ ] 写组件测试：没有 `window.ethereum` 时显示 `Wallet provider not found / 未检测到钱包插件`。
- [ ] 实现浏览器钱包绑定流程。
- [ ] E2E 中 mock `window.ethereum.request`，验证账户页显示已连接地址。

**验收标准:**

- 钱包插件不存在时不会报错。
- 签名失败时不会写入已连接状态。
- 签名成功后账户页显示 EOA address 和 chainId。

---

## Task 7: Admin And E2E Acceptance

**目标:** Admin 和 E2E 能证明 wallet readiness 已进入产品闭环。

**Files:**
- Modify: `apps/admin/src/views/PlaceholderView.vue`
- Modify: `tests/e2e/account.spec.ts`
- Modify: `tests/e2e/admin.spec.ts`

**Steps:**

- [ ] Admin Risk / Settings 页面显示 `walletBindingProof`、`depositWalletReadiness`、`fundingAllowance`、`regionRisk`。
- [ ] E2E 覆盖登录账户页读取 readiness。
- [ ] E2E 覆盖 mock 钱包绑定成功。
- [ ] E2E 覆盖订单 preview 页面仍 disabled，但显示 wallet gate 原因。

**验收标准:**

- Admin 能看到钱包 readiness gate。
- Account 能看到 wallet readiness。
- Market detail preview 能看到不能签名的明确原因。

---

## Final Verification

必须全部通过：

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

本地检查：

```bash
Invoke-RestMethod http://localhost:4000/health
```

## Acceptance Checklist

- [ ] `POST /wallets/nonce` 登录后返回 nonce、message、expiresAt。
- [ ] `POST /wallets/verify` 能验证 EOA signature 并保存 `Wallet(type=EOA)`。
- [ ] 过期 nonce、已消费 nonce、错误签名都不能绑定钱包。
- [ ] `GET /wallets/me` 返回 EOA、Deposit Wallet、funding、region、canPreview、canSign。
- [ ] 没有钱包时 `/orders/preview` 仍可返回 CLOB draft，但 `readiness.canSign === false`。
- [ ] 账户页显示 API readiness，不再只有硬编码状态。
- [ ] 有浏览器钱包时可完成 mock 绑定流程；无钱包时显示缺失提示。
- [ ] Admin 能看到 wallet / deposit / funding / region gate。
- [ ] 默认不创建真实 Deposit Wallet。
- [ ] 默认不发起真实 pUSD 授权。
- [ ] 默认不提交真实 CLOB。

## Next Step After This Plan

完成本计划后，再执行 `Signed Order Mock Submit`：

1. `POST /orders/signed`
2. mock CLOB provider
3. 本地订单状态机
4. Admin Orders 状态和失败原因

真实 CLOB adapter 仍放在 mock submit 通过之后。
