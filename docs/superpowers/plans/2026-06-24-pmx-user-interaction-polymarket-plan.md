# PMX User Interaction And Polymarket-Style Betting Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把用户端从“能看市场的静态页面”升级为“可点击、可理解、可预览投注路径”的交易产品界面。

**Architecture:** Web 仍使用 Next.js + React + TypeScript。市场列表、市场详情、订单票据、账户中心、投资组合、活动记录拆成独立 feature/component，避免继续把交互堆在 `page.tsx` 里。真实 CLOB 下单继续禁用，只做投注 UI、订单预览、人工 Gate 和本地活动记录。

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library, Playwright, NestJS API, Prisma market snapshots.

---

## 用户已指出的问题

| 问题 | 当前表现 | 必须进入计划的修正 |
|---|---|---|
| 页面缺少实际交互 | 市场、投资组合、活动、账户页面多数只是展示 | 每个顶部入口都要有可用页面和明确状态 |
| 账户页内容太少 | 只显示邮箱和退出登录 | 改成账户中心，显示身份、钱包、Deposit Wallet、余额/授权、订单预览、风控状态 |
| 点击盘口不像 Polymarket | 点 Yes/No 只更新右侧票据，不进入投注上下文 | 点击市场或盘口进入市场详情页，右侧出现更完整投注面板 |
| 投注 UI 不完整 | 没有金额输入、份数、预计回报、Buy/Sell 切换 | 参考 Polymarket 的 Buy/Sell、Yes/No、金额输入、预计回报、提交 Gate |
| 页面像展示页 | 有市场卡片，但没有完整用户路径 | 首页列表 -> 市场详情 -> 投注预览 -> 账户/活动留痕 |
| 不需要装饰动态 UI | 国旗轮转、实时金额飘动这类装饰不实用 | 不做装饰轮播、金额飘动、伪实时动画；只保留真实操作反馈 |

---

## 明确不做

| 不做项 | 原因 |
|---|---|
| 真实 CLOB 提交 | 当前还没有签名、风控、钱包和权限闭环 |
| 钱包托管 | 产品方向是非托管 |
| 国旗轮转 | 装饰性大于实用性 |
| 实时投注金额飘动 | 当前没有真实订单流，做了也是假动态 |
| 复杂图表和盘口深度 | 当前阶段先完成基础投注路径 |
| 自动真实入金/授权 | 后续钱包和 Deposit Wallet 阶段再做 |

---

## 文件结构规划

| 文件 | 职责 |
|---|---|
| `apps/web/src/app/page.tsx` | 市场列表首页，只负责筛选、搜索、进入详情 |
| `apps/web/src/app/markets/[marketId]/page.tsx` | 市场详情路由入口 |
| `apps/web/src/features/markets/market-detail-page.tsx` | 市场详情页面主体 |
| `apps/web/src/features/trading/order-ticket.tsx` | Polymarket 风格投注票据 |
| `apps/web/src/features/trading/order-calculator.ts` | 金额、份数、预计成本、预计回报计算 |
| `apps/web/src/features/trading/order-ticket.test.tsx` | 投注票据交互测试 |
| `apps/web/src/features/trading/order-calculator.test.ts` | 投注计算单元测试 |
| `apps/web/src/features/activity/activity-store.ts` | 本地活动记录读写，先用 localStorage |
| `apps/web/src/features/activity/activity-store.test.ts` | 活动记录测试 |
| `apps/web/src/app/account/page.tsx` | 账户中心页面 |
| `apps/web/src/features/auth/account-panel.tsx` | 账户状态、钱包状态、Deposit Wallet、风险状态 |
| `apps/web/src/app/portfolio/page.tsx` | 投资组合页面，显示持仓/订单空状态 |
| `apps/web/src/app/activity/page.tsx` | 活动页，显示市场点击和订单预览记录 |
| `apps/web/src/features/layout/web-topbar.tsx` | 顶部导航链接指向真实页面 |
| `apps/web/src/features/i18n/messages.ts` | 新页面和投注交互中英文文案 |
| `apps/web/src/app/globals.css` | 市场详情、投注票据、账户中心样式 |
| `tests/e2e/home.spec.ts` | 首页、市场详情、投注交互 E2E |
| `tests/e2e/account.spec.ts` | 账户、投资组合、活动页 E2E |

---

## Task 1: 首页盘口进入市场详情

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/page.test.tsx`
- Create: `apps/web/src/app/markets/[marketId]/page.tsx`
- Create: `apps/web/src/features/markets/market-detail-page.tsx`
- Modify: `tests/e2e/home.spec.ts`

- [ ] **Step 1: 写失败测试**

在 `apps/web/src/app/page.test.tsx` 增加：

```ts
it("links each market card and outcome button to the market detail page", async () => {
  fetchMarketsMock.mockResolvedValue([
    {
      id: "snapshot_1",
      marketId: "market_1",
      slug: "spread-colombia-dr-congo",
      question: "Spread: Colombia (-5.5)",
      category: "Sports",
      active: true,
      closed: false,
      outcomes: ["Colombia", "DR Congo"],
      outcomePrices: ["0.01", "0.99"],
      volume: "746",
      liquidity: "16729",
      syncedAt: "2026-06-24T00:00:00.000Z"
    }
  ]);

  renderHome();

  expect(await screen.findByRole("link", { name: /让分：哥伦比亚/ })).toHaveAttribute(
    "href",
    "/markets/market_1"
  );
  expect(screen.getByRole("link", { name: /哥伦比亚 1c/ })).toHaveAttribute(
    "href",
    "/markets/market_1?side=yes"
  );
});
```

- [ ] **Step 2: 确认失败**

Run:

```bash
npm run test --workspace @pmx/web -- page.test.tsx
```

Expected: FAIL，因为当前卡片和盘口按钮不是详情页链接。

- [ ] **Step 3: 实现链接**

在首页市场卡片标题和 Yes/No 按钮上使用 `next/link`：

```tsx
<Link className="market-card-title" href={`/markets/${market.source.marketId}`}>
  {market.question}
</Link>

<Link href={`/markets/${market.source.marketId}?side=yes`}>
  {market.outcomes[0]} {toCents(market.prices[0])}c
</Link>
```

- [ ] **Step 4: 增加详情路由**

`apps/web/src/app/markets/[marketId]/page.tsx`：

```tsx
import { MarketDetailPage } from "../../../features/markets/market-detail-page";

interface MarketRouteProps {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<{ side?: string }>;
}

export default async function MarketRoute({ params, searchParams }: MarketRouteProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  return (
    <MarketDetailPage
      initialMarketId={resolvedParams.marketId}
      initialSide={resolvedSearch.side === "no" ? "no" : "yes"}
    />
  );
}
```

- [ ] **Step 5: 验证**

Run:

```bash
npm run test --workspace @pmx/web -- page.test.tsx
npm run test:e2e
```

Expected: 首页点击市场/盘口能进入 `/markets/<marketId>`。

---

## Task 2: Polymarket 风格投注票据

**Files:**
- Create: `apps/web/src/features/trading/order-calculator.ts`
- Create: `apps/web/src/features/trading/order-calculator.test.ts`
- Create: `apps/web/src/features/trading/order-ticket.tsx`
- Create: `apps/web/src/features/trading/order-ticket.test.tsx`
- Modify: `apps/web/src/features/i18n/messages.ts`

- [ ] **Step 1: 写计算测试**

`apps/web/src/features/trading/order-calculator.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { calculateOrderPreview } from "./order-calculator";

describe("calculateOrderPreview", () => {
  it("calculates shares, cost, and estimated payout from amount and price", () => {
    expect(calculateOrderPreview({ amountUsd: 10, price: 0.25 })).toEqual({
      amountUsd: 10,
      price: 0.25,
      shares: 40,
      estimatedPayout: 40,
      estimatedProfit: 30
    });
  });

  it("returns zero values when price or amount is invalid", () => {
    expect(calculateOrderPreview({ amountUsd: 10, price: 0 })).toEqual({
      amountUsd: 10,
      price: 0,
      shares: 0,
      estimatedPayout: 0,
      estimatedProfit: 0
    });
  });
});
```

- [ ] **Step 2: 实现计算函数**

`apps/web/src/features/trading/order-calculator.ts`：

```ts
interface OrderPreviewInput {
  amountUsd: number;
  price: number;
}

interface OrderPreviewResult {
  amountUsd: number;
  price: number;
  shares: number;
  estimatedPayout: number;
  estimatedProfit: number;
}

export function calculateOrderPreview(input: OrderPreviewInput): OrderPreviewResult {
  if (!Number.isFinite(input.amountUsd) || !Number.isFinite(input.price) || input.amountUsd <= 0 || input.price <= 0) {
    return {
      amountUsd: input.amountUsd,
      price: input.price,
      shares: 0,
      estimatedPayout: 0,
      estimatedProfit: 0
    };
  }

  const shares = input.amountUsd / input.price;
  const estimatedPayout = shares;

  return {
    amountUsd: input.amountUsd,
    price: input.price,
    shares: roundMoney(shares),
    estimatedPayout: roundMoney(estimatedPayout),
    estimatedProfit: roundMoney(estimatedPayout - input.amountUsd)
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 3: 写票据交互测试**

`apps/web/src/features/trading/order-ticket.test.tsx`：

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTicket } from "./order-ticket";

describe("OrderTicket", () => {
  it("updates amount, shares, payout, and side without submitting a real order", () => {
    render(
      <OrderTicket
        locale="zh-CN"
        marketTitle="让分：哥伦比亚（-5.5）"
        outcomes={["哥伦比亚", "刚果民主共和国"]}
        prices={[0.25, 0.75]}
        initialSide="yes"
      />
    );

    fireEvent.change(screen.getByLabelText("金额"), { target: { value: "10" } });

    expect(screen.getByText("40 份")).toBeInTheDocument();
    expect(screen.getByText("$40.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "买入 刚果民主共和国" }));

    expect(screen.getByText("13.33 份")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "人工确认 Gate" })).toBeDisabled();
  });
});
```

- [ ] **Step 4: 实现投注票据**

`OrderTicket` 必须包含：
- Buy / Sell 分段控制
- Yes / No 或两结果按钮
- 金额输入
- 价格
- 可获得份数
- 预计回报
- 预计利润
- 交易路径
- 风险提示
- 禁用的人工 Gate 按钮

- [ ] **Step 5: 验证**

Run:

```bash
npm run test --workspace @pmx/web -- order-calculator.test.ts order-ticket.test.tsx
```

Expected: PASS。

---

## Task 3: 市场详情页

**Files:**
- Modify: `apps/web/src/features/markets/market-detail-page.tsx`
- Modify: `apps/web/src/features/markets/markets-client.ts`
- Modify: `apps/web/src/app/globals.css`
- Modify: `tests/e2e/home.spec.ts`

- [ ] **Step 1: 写 E2E**

在 `tests/e2e/home.spec.ts` 增加：

```ts
test("opens a market detail page with a working order ticket", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: /让分|总分|Will|会/ }).first().click();

  await expect(page).toHaveURL(/\/markets\//);
  await expect(page.getByRole("heading", { name: "订单票据" })).toBeVisible();
  await page.getByLabel("金额").fill("10");
  await expect(page.getByText(/预计回报/)).toBeVisible();
  await expect(page.getByRole("button", { name: "人工确认 Gate" })).toBeDisabled();
});
```

- [ ] **Step 2: 实现详情页布局**

详情页参考 Polymarket，但只取实用结构：
- 左侧市场标题、分类、状态、成交量、流动性
- 中间结果区，显示两个 outcome 的价格按钮
- 下方规则/风险说明
- 右侧 sticky 订单票据

- [ ] **Step 3: 验证**

Run:

```bash
npm run test:e2e
```

Expected: 从首页点击盘口进入详情页，金额输入后订单预览变化。

---

## Task 4: 账户页重构

**Files:**
- Modify: `apps/web/src/app/account/page.tsx`
- Modify: `apps/web/src/features/auth/account-panel.tsx`
- Modify: `apps/web/src/features/auth/account-panel.test.tsx`
- Modify: `apps/web/src/features/i18n/messages.ts`
- Modify: `apps/web/src/app/globals.css`
- Create: `tests/e2e/account.spec.ts`

- [ ] **Step 1: 写账户页测试**

`apps/web/src/features/auth/account-panel.test.tsx` 增加：

```tsx
it("shows account, wallet, deposit wallet, balance, and risk sections", async () => {
  vi.spyOn(authClient, "readAccessToken").mockReturnValue("token");
  vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
    id: "user_123",
    email: "person@example.com"
  });

  renderAccountPanel();

  expect(await screen.findByText("person@example.com")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "钱包状态" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Deposit Wallet" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "资金与授权" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "风控状态" })).toBeInTheDocument();
});
```

- [ ] **Step 2: 实现账户中心**

账户页必须显示：
- 邮箱
- 角色：USER
- 钱包状态：未连接
- Deposit Wallet：未创建
- 余额：等待钱包
- 授权：等待钱包
- 地区/风控：待检查
- 最近订单预览：暂无
- 退出登录

- [ ] **Step 3: E2E 验收**

`tests/e2e/account.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("account page is a usable account center", async ({ page }) => {
  await page.goto("/account");

  await expect(page.getByRole("heading", { name: "账户中心" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "钱包状态" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deposit Wallet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "资金与授权" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "风控状态" })).toBeVisible();
});
```

- [ ] **Step 4: 验证**

Run:

```bash
npm run test --workspace @pmx/web -- account-panel.test.tsx
npm run test:e2e
```

Expected: 账户页不再只有邮箱。

---

## Task 5: 投资组合页和活动页

**Files:**
- Create: `apps/web/src/app/portfolio/page.tsx`
- Create: `apps/web/src/app/activity/page.tsx`
- Create: `apps/web/src/features/activity/activity-store.ts`
- Create: `apps/web/src/features/activity/activity-store.test.ts`
- Modify: `apps/web/src/features/layout/web-topbar.tsx`
- Modify: `apps/web/src/features/i18n/messages.ts`
- Modify: `tests/e2e/account.spec.ts`

- [ ] **Step 1: 顶部导航改成真实路由**

`web-topbar.tsx`：
- 市场 -> `/`
- 投资组合 -> `/portfolio`
- 活动 -> `/activity`
- 账户 -> `/account`

- [ ] **Step 2: 活动记录 store**

`activity-store.ts`：

```ts
export interface ActivityItem {
  id: string;
  type: "market.viewed" | "order.previewed" | "auth.login";
  label: string;
  createdAt: string;
}

const ACTIVITY_KEY = "pmx.activity";

export function readActivity(): ActivityItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(ACTIVITY_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as ActivityItem[];
  } catch {
    return [];
  }
}

export function appendActivity(item: Omit<ActivityItem, "id" | "createdAt">): ActivityItem {
  const next: ActivityItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify([next, ...readActivity()].slice(0, 20)));
  return next;
}
```

- [ ] **Step 3: 投资组合页内容**

投资组合页必须显示：
- 持仓：暂无持仓
- 开放订单：暂无订单
- 资金准备：钱包未连接
- Deposit Wallet：未创建
- 提示：真实交易关闭

- [ ] **Step 4: 活动页内容**

活动页必须显示：
- 最近活动列表
- 空状态
- 市场查看记录
- 订单预览记录

- [ ] **Step 5: 验证**

Run:

```bash
npm run test --workspace @pmx/web -- activity-store.test.ts
npm run test:e2e
```

Expected: 顶部三个导航都进入有内容的页面。

---

## Task 6: 中文词典和 Polymarket 盘口扩展

**Files:**
- Modify: `apps/web/src/features/markets/market-localization.ts`
- Modify: `apps/web/src/features/markets/market-localization.test.ts`

- [ ] **Step 1: 补测试**

覆盖这些类型：
- `Spread: Team (-5.5)` -> `让分：队伍（-5.5）`
- `Team A vs. Team B: O/U 8.5` -> `Team A 对 Team B：总分大/小 8.5`
- `Over` -> `大于`
- `Under` -> `小于`
- 国家/队伍：Colombia、DR Congo、England、Panama、Brazil、France、Japan

- [ ] **Step 2: 补字典**

新增队伍/国家词典：
- Colombia -> 哥伦比亚
- DR Congo -> 刚果民主共和国
- England -> 英格兰
- Panama -> 巴拿马
- Brazil -> 巴西
- France -> 法国
- Japan -> 日本

- [ ] **Step 3: 验证**

Run:

```bash
npm run test --workspace @pmx/web -- market-localization.test.ts
```

Expected: 当前真实市场列表不再大面积出现英文盘口。

---

## Task 7: 全量验收

**Files:**
- Verify: whole repo

- [ ] **Step 1: 单测**

```bash
npm test
```

Expected: API、Web、Shared 全部通过。

- [ ] **Step 2: 构建**

```bash
npm run build
```

Expected: Shared、API、Web、Admin 全部构建通过。

- [ ] **Step 3: E2E**

```bash
npm run test:e2e
```

Expected: 首页、市场详情、账户页、投资组合、活动页、Admin 登录全部通过。

- [ ] **Step 4: 浏览器人工检查**

打开：
- `http://localhost:3000`
- `http://localhost:3000/account`
- `http://localhost:3000/portfolio`
- `http://localhost:3000/activity`
- 任意 `/markets/<marketId>`

Expected:
- 登录用户能看到完整账户信息
- 点击盘口进入详情页
- 金额输入会更新预计回报
- 真实提交按钮仍禁用
- 页面没有国旗轮转和金额飘动

- [ ] **Step 5: 提交**

```bash
git status --short
git add apps/web tests/e2e
git commit -m "feat: add polymarket-style user trading flow"
git push
```

Expected: 当前分支推送成功。

---

## 总验收标准

| 项目 | 标准 |
|---|---|
| 用户端交互 | 首页、详情页、账户、投资组合、活动都不是空页面 |
| 盘口点击 | 点击市场或盘口能进入详情页 |
| 投注票据 | Buy/Sell、结果切换、金额输入、成本、份数、预计回报可联动 |
| 账户页 | 显示账户、钱包、Deposit Wallet、资金授权、风控、订单预览 |
| Polymarket 参考 | 参考投注交互和信息结构，不复制装饰动态 UI |
| 安全边界 | 真实下单仍被人工 Gate 禁用 |
| 中文 | 中文界面下主要交易文案和常见盘口中文化 |
| 验证 | `npm test`、`npm run build`、`npm run test:e2e` 全部通过 |

