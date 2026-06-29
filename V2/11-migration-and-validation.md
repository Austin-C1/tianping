# V2 迁移和验证方案

## 迁移原则

- 不一次性大爆炸重构。
- 每一步都保持项目可运行。
- 先整理工程边界，再迁移业务模块。
- 先生成 API client，再逐步替换手写 client。
- 前端先建立 actions/flows，再把页面里的跨模块编排迁出去。
- 先做 Provider 薄封装，不重写 Polymarket SDK。
- 先拆钱包、余额、Funding 的边界，再改 UI 展示。
- AI 可调用的业务流程测试优先走 flow tests，不把 Playwright 当主流程执行器。

## 迁移阶段

### 阶段 1：建立 Nx 工作区

目标：

- 引入 Nx。
- 保留现有 `apps/web`、`apps/admin`、`apps/api`。
- 把当前 npm scripts 映射到 Nx targets。

完成标准：

```bash
npx nx graph
npx nx run web:build
npx nx run admin:build
npx nx run api:build
```

### 阶段 2：迁移共享库

目标：

- `packages/shared` 拆成 `libs/contracts` 和 `libs/domain`。
- 当前 `PLATFORM_PHASES`、`MANUAL_GATES` 放进 contracts 或 domain。
- Web/API/Admin 统一 import 新库。

完成标准：

```bash
npx nx affected -t build test
```

### 阶段 3：建立 OpenAPI 和 api-client

目标：

- API 能导出 `openapi.json`。
- `libs/api-client` 根据 OpenAPI 生成类型和 client。
- Web/Admin 新代码禁止手写 API 路径。

完成标准：

```bash
npx nx run api:openapi
npx nx run api-client:generate
npx nx run api-client:typecheck
```

### 阶段 4：拆后端基础设施层

目标：

- Prisma 移入 `infrastructure/database/prisma`。
- 新增 repositories 和 transaction manager。
- 订单、钱包、余额、审计优先走 repository。

完成标准：

```bash
npx nx run api:test
```

### 阶段 5：建立 Provider 适配层

目标：

- 新建 `market-providers`。
- Polymarket Gamma、CLOB、Relayer 只在 adapter 内部出现。
- markets/orders/balances/funding 通过 Provider 接口调用。
- 增加 MockProvider 用于测试。

完成标准：

```bash
npx nx run api:test
npx nx run api:build
```

### 阶段 6：拆钱包、余额、Funding

目标：

- API 拆出 `wallets`、`deposit-wallets`、`balances`、`funding`。
- Web 拆出对应模块。
- Admin 拆出对应只读和风控模块。

完成标准：

```bash
npx nx affected -t build test
npm run test:e2e
```

### 阶段 7：建立 Web Business Flow Layer

目标：

- Web 模块补齐 `*.actions.ts`，封装单模块动作。
- 新增 `flows/*`，封装跨模块业务流程。
- 新增 `flows/scenarios/*`，提供 AI 和测试可直接调用的完整业务用例。
- 把页面组件里的注册/登录、市场选择、订单预览、钱包准备、Funding readiness 等流程编排迁入 flows。
- 真实钱包签名、Deposit Wallet relayer、Provider、Clock 通过 adapter 注入，测试环境使用 mock/sandbox。

完成标准：

```bash
npx nx run web:test
npm run test:flows
```

关键流程：

| Flow | 覆盖 |
|---|---|
| `register-login` | 注册、登录、读取当前用户 |
| `trade-preview-ready` | 登录、选市场、刷新 readiness、订单预览 |
| `wallet-funding-blocked` | 钱包未准备、Deposit Wallet 缺失、Funding 阻塞原因 |
| `wallet-funding-ready` | mock 钱包、mock Deposit Wallet、mock 余额授权、可进入签名前状态 |

### 阶段 8：整理前台和后台模块

目标：

- Web 页面只组合模块，不塞业务细节。
- Admin 页面只调用后台 API，不直接写业务判断。
- 远程数据状态尽量用 query cache，减少手写全局 store。
- Playwright 只保留页面 smoke、核心导航和少量真实浏览器交互验证。

完成标准：

```bash
npx nx run web:test
npx nx run admin:build
npm run test:flows
npm run test:e2e
```

## 验收标准

| 项目 | 验收 |
|---|---|
| 项目结构 | Nx graph 能展示 Web、Admin、API、contracts、api-client、domain |
| 依赖边界 | Web/Admin 不能 import API 内部代码 |
| API 契约 | API 改动能生成 OpenAPI 和 api-client |
| Web | 能登录、浏览市场、查看账户、订单预览 |
| Web flows | AI/测试能直接调用注册登录、选市场、钱包准备、Funding readiness、订单预览 |
| Admin | 管理员能登录，普通用户不能进入后台 |
| API | `/health` 正常，auth/markets/wallets/orders 测试通过 |
| 数据库 | migration、seed、repository 测试通过 |
| Provider | MockProvider 测试通过，Polymarket adapter 只在 infrastructure 内出现 |
| 钱包余额 | 钱包验证、Deposit Wallet、余额、Funding 各自独立 |
| Flow 测试 | 主业务路径通过，不依赖 DOM、selector、浏览器页面 |
| E2E | 页面 smoke、核心导航和 Admin 权限流通过 |

## 风险和处理

| 风险 | 处理 |
|---|---|
| 一次迁移太大 | 分阶段，每阶段都能 build/test |
| OpenAPI 生成不稳定 | 先只覆盖新接口，再逐步迁移旧接口 |
| DTO 和 contracts 重复 | 以 API OpenAPI 输出为准，逐步减少手写重复 |
| Repository 过度封装 | 只封装复杂模块，简单查询保持克制 |
| Provider 抽象过大 | 只抽象当前真实需要的能力 |
| 前端模块过碎 | 页面按业务组合，模块只在职责清楚时拆 |
| Flow 层变成另一个后端 | Flow 只编排前端动作，不访问数据库、不引入后端内部代码 |
| AI 测试误触真实交易 | 测试默认使用 mock/sandbox adapter，真实提交必须单独开启人工确认和环境保护 |
| Playwright 维护成本高 | 业务流程迁到 flow tests，Playwright 只保留少量 UI smoke |

## 不改动的内容

V2 文档阶段不改：

- 现有业务代码。
- 数据库 schema。
- Docker 服务。
- 线上配置。
- 真实 CLOB 提交流程。

真正实施时，每个阶段单独开分支或小 PR。
