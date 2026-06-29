# 共享契约与 API Client

## 目标

三端要共享的是 **API 契约**，不是数据库模型，也不是后端内部服务。

共享内容包括：

- 请求 DTO
- 响应 DTO
- 公共枚举
- 状态码
- 错误码
- 分页结构
- API client 类型

不共享：

- Prisma Model
- Repository
- NestJS Service
- Controller
- React/Vue 组件
- Polymarket SDK 类型

## 推荐结构

```text
libs/
  contracts/
    src/
      common/
        api-response.ts
        api-error.ts
        pagination.ts
      auth/
        auth.types.ts
      users/
        user.types.ts
        user-role.ts
      markets/
        market.types.ts
        market-status.ts
      wallets/
        wallet.types.ts
        wallet-status.ts
      deposit-wallets/
        deposit-wallet.types.ts
      balances/
        balance.types.ts
      funding/
        funding-readiness.types.ts
      orders/
        order.types.ts
        order-status.ts
      audit/
        audit.types.ts
      index.ts

  api-client/
    src/
      generated/
        schema.ts
        client.ts
      index.ts
```

## 契约来源

推荐用 **NestJS OpenAPI 作为契约来源**：

```text
apps/api DTO + Swagger decorators
  -> 生成 openapi.json
  -> openapi-typescript 生成 TypeScript types
  -> openapi-fetch 或轻量 wrapper 生成 API client
  -> Web/Admin 使用 api-client
```

这样可以减少手写 client 和重复类型。

## 为什么不直接共享 Prisma Model

数据库模型通常包含前端不该知道的字段：

```text
User
  id
  email
  passwordHash
  role
  createdAt
  updatedAt
```

API 暴露给前端应该是：

```text
UserProfileDto
  id
  email
  role
```

中间必须有 mapper，不允许把 `passwordHash` 这类内部字段带到 contracts。

## 命名规则

| 类型 | 命名 |
|---|---|
| 请求 | `LoginRequest`、`PreviewOrderRequest` |
| 响应 | `LoginResponse`、`MarketListResponse` |
| 页面列表项 | `AdminUserListItem`、`MarketListItem` |
| 详情模型 | `MarketDetail`、`OrderDetail` |
| 枚举 | `UserRole`、`OrderStatus`、`WalletStatus` |
| 错误码 | `ApiErrorCode` |

## contracts 内容边界

| 可以放 | 不可以放 |
|---|---|
| `UserRole` | `Prisma.User` |
| `OrderStatus` | `ClobOrderRawPayload` |
| `MarketListItem` | `PolymarketGammaMarketRaw` |
| `PreviewOrderRequest` | `OrdersService` |
| `ApiErrorResponse` | `HttpException` 实例 |
| `FundingReadinessStatus` | `WalletFundingService` |

## API client 使用方式

Web/Admin 不手写路径字符串：

```text
import { apiClient } from "@pmx/api-client";

const markets = await apiClient.markets.list();
const preview = await apiClient.orders.preview(input);
```

实际实现由 OpenAPI 生成，外面只包一层认证、错误处理和 base URL。

## 与前端业务流程层的关系

`@pmx/api-client` 只负责稳定、类型安全地访问后端 API。它不是前端业务流程层。

V2 Web 需要在 `api-client` 之上再封装：

```text
@pmx/api-client
  -> Web module actions
  -> Web business flows
  -> UI / Flow tests / AI caller
```

分工：

| 层 | 作用 |
|---|---|
| `api-client` | 生成式 typed HTTP client，处理路径、类型、认证 header、统一错误 |
| `module actions` | 单模块动作，例如 `login`、`fetchMarkets`、`previewOrder`、`refreshFundingReadiness` |
| `business flows` | 跨模块流程，例如注册登录后选市场、绑定钱包后刷新 Funding、准备订单预览 |
| `flow scenarios` | 给测试和 AI 直接调用的完整业务用例 |

AI 和自动化测试不应该绕过这层直接拼 HTTP 请求，也不应该通过 Playwright selector 操作页面来验证主业务流程。

示例：

```text
await flows.auth.registerAndLogin(input)
await flows.markets.pickTradableMarket()
await flows.wallet.bindMockWallet()
await flows.funding.refreshReadiness()
await flows.trade.previewOrder(orderInput)
```

这样能保证：

- UI 和 AI 测试复用同一套业务编排。
- API 路径和 DTO 仍由 OpenAPI 生成结果约束。
- 业务流程测试不依赖 DOM、浏览器状态或按钮文案。
- 真实钱包、Relayer、Provider、Clock 等外部依赖可以通过 adapter/mock 替换。

## 错误结构

统一错误响应：

```text
ApiErrorResponse
  code
  message
  details?
  requestId?
```

错误码按模块划分：

```text
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
WALLET_NOT_VERIFIED
BALANCE_INSUFFICIENT
ORDER_MARKET_CLOSED
PROVIDER_UNAVAILABLE
COMPLIANCE_BLOCKED_REGION
```

## 生成流程

```bash
npx nx run api:openapi
npx nx run api-client:generate
npx nx run api-client:typecheck
```

CI 要求：

- API 改接口后必须重新生成 client。
- 生成结果有 diff 时，CI 失败。
- Web/Admin 不能直接写未声明的 API 路径。

## 可选增强

如果后面希望三端真正共享 runtime schema，可以评估：

- Zod
- zod-to-openapi
- nestjs-zod

V2 默认不强制引入，因为当前 API 已经使用 NestJS DTO 和 class-validator，直接迁移 runtime schema 成本较高。
