# PMX Light Market UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current crowded preview trading workspace with a lightweight PMX market UI: homepage shows only high total-bet markets and all markets, category pages provide left-side drilldown, market detail shows odds, and account/portfolio pages show positions and PnL structure.

**Architecture:** Keep this as a web presentation change. Extract market display helpers first so home, category, and detail pages share sorting, localized labels, odds formatting, and activity amount logic. Do not add backend dependencies unless an already-exposed API field is missing from the web client type.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, Playwright, CSS in `apps/web/src/app/globals.css`.

---

## Starting Context

- Spec: `docs/superpowers/specs/2026-06-25-pmx-light-market-ui-design.md`
- Current branch at plan creation: `codex/local-control-loop-i18n-admin-zh`
- Current UI entry files:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/features/markets/market-detail-page.tsx`
  - `apps/web/src/features/auth/account-panel.tsx`
  - `apps/web/src/app/portfolio/page.tsx`
  - `apps/web/src/features/i18n/messages.ts`
  - `apps/web/src/app/globals.css`

Before editing in a new session:

- [ ] Run `git status -sb`
  - Expected: either clean, or only intentional plan/spec files.
- [ ] Run `git log -1 --oneline --decorate`
  - Expected: latest local commit can be `2252103 Add PMX light market UI design spec` or a newer user commit.
- [ ] Read the spec file:
  - `docs/superpowers/specs/2026-06-25-pmx-light-market-ui-design.md`

## File Structure

Create these files:

- `apps/web/src/features/markets/market-display.ts`
  - Shared display model for localized market title, category, outcome labels, quote prices, activity amount, and links.
- `apps/web/src/features/markets/market-display.test.ts`
  - Unit coverage for quote precedence, activity sorting, and formatting.
- `apps/web/src/features/markets/market-list-page.tsx`
  - Category/drilldown page with left navigation and compact market rows.
- `apps/web/src/features/markets/market-list-page.test.tsx`
  - Unit coverage for category sidebar and filtered rows.
- `apps/web/src/app/markets/page.tsx`
  - `/markets?category=Sports` route that renders `MarketListPage`.
- `apps/web/src/features/portfolio/position-ledger-data.ts`
  - Converts local activity into preview position rows without inventing real fills or profit.
- `apps/web/src/features/portfolio/position-ledger.tsx`
  - Shared current/historical positions and PnL panel.
- `apps/web/src/features/portfolio/position-ledger.test.tsx`
  - Unit coverage for active preview rows, empty history, and localized PnL labels.
- `apps/web/src/features/markets/market-detail-page.test.tsx`
  - Unit coverage for odds-only detail page and lazy order ticket.

Modify these files:

- `apps/web/src/app/page.tsx`
  - Replace current category rail + hero + permanent ticket with home high-volume and all-market sections.
- `apps/web/src/app/page.test.tsx`
  - Replace old workspace expectations with new homepage behavior.
- `apps/web/src/features/markets/market-detail-page.tsx`
  - Remove unrelated info panels and permanent order ticket. Show all outcomes/quotes and open ticket only after odds selection.
- `apps/web/src/features/trading/order-ticket.tsx`
  - Add optional outcome-index controlled mode so detail can select any outcome rendered from local market data.
- `apps/web/src/features/auth/account-panel.tsx`
  - Put position/PnL view first for authenticated users.
- `apps/web/src/app/portfolio/page.tsx`
  - Reuse the position/PnL view.
- `apps/web/src/features/i18n/messages.ts`
  - Add home and account copy for high total-bet markets, all markets, total bet amount, positions, history, and PnL.
- `apps/web/src/app/globals.css`
  - Replace old home/ticket/sidebar styling with light market terminal layout. Keep responsive behavior.
- `tests/e2e/home.spec.ts`
  - Update homepage e2e assertions and add category/detail/account checks.

## Data Boundaries

- Use `MarketListItem.volume` as the primary total bet amount.
- Use `MarketListItem.volume24hr` only as a secondary display signal.
- Use `MarketListItem.liquidity` only when volume is missing.
- Do not fabricate sports lines such as handicap or totals if the API does not provide them.
- Market detail must render all outcomes and quote prices available in `outcomes`, `outcomePrices`, and `quotes`.
- Real current positions and historical PnL are not available before order/fill reconciliation. The account UI should display:
  - local preview-derived active rows when `pmx.activity` contains order previews
  - clear empty state for historical rows
  - `$0.00` PnL until real position data exists

---

### Task 1: Shared Market Display Model

**Files:**
- Create: `apps/web/src/features/markets/market-display.ts`
- Create: `apps/web/src/features/markets/market-display.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `apps/web/src/features/markets/market-display.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MarketListItem } from "./markets-client";
import {
  formatCentsValue,
  formatUsdAmount,
  getMarketActivityAmount,
  sortMarketsByActivity,
  toDisplayMarket
} from "./market-display";

const baseMarket: MarketListItem = {
  id: "snapshot_1",
  marketId: "market_1",
  conditionId: null,
  clobTokenIds: [],
  enableOrderBook: false,
  slug: "market-1",
  question: "Spread: Colombia (-5.5)",
  category: "Sports",
  active: true,
  closed: false,
  outcomes: ["Colombia", "DR Congo"],
  outcomePrices: ["0.01", "0.99"],
  volume: "746",
  volume24hr: "100",
  liquidity: "16729",
  syncedAt: "2026-06-24T00:00:00.000Z",
  quotes: []
};

describe("market-display", () => {
  it("uses CLOB best ask quotes before Gamma outcome prices", () => {
    const market = toDisplayMarket(
      {
        ...baseMarket,
        quotes: [
          {
            outcome: "Colombia",
            outcomeIndex: 0,
            tokenId: "token_yes",
            bestBid: "0.24",
            bestAsk: "0.25",
            midpoint: "0.245",
            spread: "0.01",
            minOrderSize: "5",
            tickSize: "0.01",
            syncedAt: "2026-06-24T00:00:02.000Z"
          }
        ]
      },
      "en",
      "Other"
    );

    expect(market.outcomes[0]).toMatchObject({
      label: "Colombia",
      outcomeIndex: 0,
      price: 0.25,
      priceLabel: "25c",
      tokenId: "token_yes"
    });
  });

  it("sorts markets by total activity amount descending", () => {
    const low = { ...baseMarket, id: "low", marketId: "low", volume: "10", liquidity: "1000" };
    const high = { ...baseMarket, id: "high", marketId: "high", volume: "500", liquidity: "1" };

    expect(sortMarketsByActivity([low, high]).map((market) => market.marketId)).toEqual(["high", "low"]);
  });

  it("falls back to liquidity when volume is missing", () => {
    expect(getMarketActivityAmount({ ...baseMarket, volume: null, liquidity: "99" })).toBe(99);
  });

  it("formats market money and cents for compact UI", () => {
    expect(formatUsdAmount("1234567")).toBe("$1.23M");
    expect(formatUsdAmount("32100")).toBe("$32.10K");
    expect(formatUsdAmount(null)).toBe("--");
    expect(formatCentsValue(0.456)).toBe("46c");
    expect(formatCentsValue(null)).toBe("--");
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```bash
npm test --workspace @pmx/web -- src/features/markets/market-display.test.ts
```

Expected: FAIL because `./market-display` does not exist.

- [ ] **Step 3: Implement the helper module**

Create `apps/web/src/features/markets/market-display.ts`:

```ts
import type { Route } from "next";
import type { Locale } from "../i18n/messages";
import { localizeMarketCategory, localizeMarketQuestion, localizeOutcome } from "./market-localization";
import type { MarketListItem, MarketQuoteItem } from "./markets-client";

export interface DisplayOutcome {
  label: string;
  outcomeIndex: number;
  price: number | null;
  priceLabel: string;
  tokenId: string | null;
}

export interface DisplayMarket {
  source: MarketListItem;
  title: string;
  category: string;
  outcomes: DisplayOutcome[];
  activityAmount: number;
  activityLabel: string;
  statusLabel: string;
  href: Route;
}

export function toDisplayMarket(
  market: MarketListItem,
  locale: Locale,
  categoryFallback: string
): DisplayMarket {
  const outcomes = toStringArray(market.outcomes);
  const prices = toOutcomePrices(market);

  return {
    source: market,
    title: localizeMarketQuestion(market.question, locale),
    category: localizeMarketCategory(market.category, locale, categoryFallback, market.question),
    outcomes: outcomes.map((outcome, index) => {
      const quote = findQuote(market.quotes, index);
      const price = toNumberOrNull(prices[index]);

      return {
        label: localizeOutcome(outcome, locale),
        outcomeIndex: index,
        price,
        priceLabel: formatCentsValue(price),
        tokenId: quote?.tokenId ?? null
      };
    }),
    activityAmount: getMarketActivityAmount(market),
    activityLabel: formatUsdAmount(getMarketActivityAmount(market)),
    statusLabel: market.active && !market.closed ? (locale === "zh-CN" ? "开放" : "Open") : (locale === "zh-CN" ? "只读" : "Read-only"),
    href: getMarketHref(market.marketId)
  };
}

export function toDisplayMarkets(
  markets: MarketListItem[],
  locale: Locale,
  categoryFallback: string
): DisplayMarket[] {
  return markets.map((market) => toDisplayMarket(market, locale, categoryFallback));
}

export function sortMarketsByActivity(markets: MarketListItem[]): MarketListItem[] {
  return [...markets].sort((left, right) => getMarketActivityAmount(right) - getMarketActivityAmount(left));
}

export function sortDisplayMarketsByActivity(markets: DisplayMarket[]): DisplayMarket[] {
  return [...markets].sort((left, right) => right.activityAmount - left.activityAmount);
}

export function getMarketActivityAmount(market: MarketListItem): number {
  return firstFiniteNumber(market.volume, market.volume24hr, market.liquidity) ?? 0;
}

export function formatUsdAmount(value: string | number | null | undefined): string {
  const numeric = typeof value === "number" ? value : toNumberOrNull(value);

  if (numeric === null) {
    return "--";
  }

  if (numeric >= 1_000_000_000) {
    return `$${(numeric / 1_000_000_000).toFixed(2)}B`;
  }

  if (numeric >= 1_000_000) {
    return `$${(numeric / 1_000_000).toFixed(2)}M`;
  }

  if (numeric >= 1_000) {
    return `$${(numeric / 1_000).toFixed(2)}K`;
  }

  return `$${numeric.toFixed(0)}`;
}

export function formatCentsValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${Math.round(value * 100)}c`;
}

export function getMarketHref(marketId: string, outcomeIndex?: number): Route {
  const baseHref = `/markets/${encodeURIComponent(marketId)}`;
  return (typeof outcomeIndex === "number" ? `${baseHref}?outcome=${outcomeIndex}` : baseHref) as Route;
}

function toOutcomePrices(market: MarketListItem): string[] {
  const gammaPrices = toStringArray(market.outcomePrices);
  const quotes = market.quotes ?? [];
  const maxQuoteIndex = Math.max(-1, ...quotes.map((quote) => quote.outcomeIndex));
  const maxLength = Math.max(gammaPrices.length, maxQuoteIndex + 1);

  return Array.from({ length: maxLength }, (_, index) => {
    const quote = findQuote(quotes, index);
    return quote?.bestAsk ?? quote?.midpoint ?? gammaPrices[index] ?? "0";
  });
}

function findQuote(quotes: MarketQuoteItem[] | undefined, outcomeIndex: number): MarketQuoteItem | undefined {
  return quotes?.find((quote) => quote.outcomeIndex === outcomeIndex);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function firstFiniteNumber(...values: Array<string | null | undefined>): number | null {
  for (const value of values) {
    const numeric = toNumberOrNull(value);
    if (numeric !== null) {
      return numeric;
    }
  }

  return null;
}

function toNumberOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
npm test --workspace @pmx/web -- src/features/markets/market-display.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/markets/market-display.ts apps/web/src/features/markets/market-display.test.ts
git commit -m "Add market display helpers"
```

---

### Task 2: Copy Dictionary For Light Market UI

**Files:**
- Modify: `apps/web/src/features/i18n/messages.ts`
- Modify: `apps/web/src/app/page.test.tsx`

- [ ] **Step 1: Write copy assertions**

In `apps/web/src/app/page.test.tsx`, replace the old `shows the product trading workspace` assertions with checks for the new home copy:

```ts
it("shows the light market homepage", async () => {
  fetchMarketsMock.mockResolvedValue([]);

  renderHome();

  expect(await screen.findByRole("heading", { name: "高投注额盘口" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "全部盘口" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "市场分类" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "交易准备" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "订单预览" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the homepage test to verify it fails**

Run:

```bash
npm test --workspace @pmx/web -- src/app/page.test.tsx
```

Expected: FAIL because the new copy keys and layout do not exist yet.

- [ ] **Step 3: Add message keys**

In `apps/web/src/features/i18n/messages.ts`, add these `home` keys for both locales.

Chinese values:

```ts
allMarkets: "全部盘口",
allMarketsSort: "按投注额排序",
endingSoon: "即将结束",
highVolumeMarkets: "高投注额盘口",
marketLine: "盘口",
odds: "赔率",
openTicket: "打开订单票据",
totalBetAmount: "总投注额"
```

English values:

```ts
allMarkets: "All markets",
allMarketsSort: "Sort by total bet amount",
endingSoon: "Ending soon",
highVolumeMarkets: "High total-bet markets",
marketLine: "Line",
odds: "Odds",
openTicket: "Open order ticket",
totalBetAmount: "Total bet amount"
```

- [ ] **Step 4: Run the homepage test again**

Run:

```bash
npm test --workspace @pmx/web -- src/app/page.test.tsx
```

Expected: still FAIL because the page still renders the old layout. The copy type errors should be resolved.

- [ ] **Step 5: Commit copy changes after Task 3 passes**

Do not commit at this step if tests still fail. Commit together with Task 3 after the homepage implementation passes.

---

### Task 3: Homepage Without Left Sidebar

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/page.test.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/features/i18n/messages.ts`

- [ ] **Step 1: Replace category-group test with high-volume/all-market behavior**

In `apps/web/src/app/page.test.tsx`, replace the test named `groups the default market view by category and keeps category drilldown complete` with:

```ts
it("sorts homepage markets by total bet amount without a left sidebar", async () => {
  window.localStorage.setItem("pmx.locale", "en");
  fetchMarketsMock.mockResolvedValue([
    {
      id: "low",
      marketId: "low",
      slug: "low",
      question: "Low activity market?",
      category: "Sports",
      active: true,
      closed: false,
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.25", "0.75"],
      volume: "10",
      liquidity: "200",
      syncedAt: "2026-06-24T00:00:00.000Z"
    },
    {
      id: "high",
      marketId: "high",
      slug: "high",
      question: "High activity market?",
      category: "Crypto",
      active: true,
      closed: false,
      outcomes: ["Up", "Down"],
      outcomePrices: ["0.60", "0.40"],
      volume: "5000",
      liquidity: "100",
      syncedAt: "2026-06-24T00:00:00.000Z"
    }
  ]);

  renderHome();

  expect(await screen.findByRole("heading", { name: "High total-bet markets" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "All markets" })).toBeInTheDocument();
  expect(screen.queryByText("Market filters")).not.toBeInTheDocument();
  expect(screen.queryByText("Trade readiness")).not.toBeInTheDocument();

  const marketLinks = await screen.findAllByRole("link", { name: /activity market/i });
  expect(marketLinks[0]).toHaveTextContent("High activity market?");
});
```

- [ ] **Step 2: Run the homepage tests to verify failure**

Run:

```bash
npm test --workspace @pmx/web -- src/app/page.test.tsx
```

Expected: FAIL because the old category rail and permanent ticket still render.

- [ ] **Step 3: Replace homepage render structure**

In `apps/web/src/app/page.tsx`:

- remove `ReadinessTone`, `readinessTones`, `MarketCategoryGroup`, `CATEGORY_PREVIEW_LIMIT`, `selectedMarketId`, `orderSide`, `readiness`, `categoryCounts`, `categoryGroups`, and `renderMarketCard`
- import helpers from `../features/markets/market-display`
- keep `fetchMarkets`, loading status, query, and refresh
- compute display data with this shape:

```ts
const displayMarkets = useMemo(
  () => toDisplayMarkets(markets.length > 0 ? markets : [emptyMarket], locale, copy.categoryFallback),
  [copy.categoryFallback, emptyMarket, locale, markets]
);

const sortedMarkets = useMemo(
  () => sortDisplayMarketsByActivity(displayMarkets),
  [displayMarkets]
);

const filteredMarkets = useMemo(() => {
  const normalizedQuery = query.trim().toLowerCase();

  return sortedMarkets.filter((market) => {
    return (
      normalizedQuery.length === 0 ||
      market.title.toLowerCase().includes(normalizedQuery) ||
      market.category.toLowerCase().includes(normalizedQuery) ||
      market.outcomes.some((outcome) => outcome.label.toLowerCase().includes(normalizedQuery))
    );
  });
}, [query, sortedMarkets]);

const highVolumeMarkets = sortedMarkets.slice(0, 6);
```

Render the page with these sections:

```tsx
<main className="trading-shell polymarket-shell">
  <WebTopbar />
  <div className="market-home-shell">
    <section className="market-home-toolbar">
      <label className="market-search">
        <span>{copy.searchLabel}</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          value={query}
        />
      </label>
      <button type="button" disabled={isRefreshingMarkets} onClick={loadMarkets}>
        {copy.syncPublicMarkets}
      </button>
    </section>

    <section className="market-home-section" aria-labelledby="high-volume-heading">
      <div className="section-heading">
        <div>
          <h1 id="high-volume-heading">{copy.highVolumeMarkets}</h1>
          <span>{marketStatus}</span>
        </div>
      </div>
      <div className="high-volume-grid">
        {highVolumeMarkets.map((market) => (
          <MarketSummaryCard key={market.source.id} market={market} totalBetLabel={copy.totalBetAmount} />
        ))}
      </div>
    </section>

    <section className="market-home-section" aria-labelledby="all-markets-heading">
      <div className="section-heading">
        <div>
          <h2 id="all-markets-heading">{copy.allMarkets}</h2>
          <span>{copy.allMarketsSort}</span>
        </div>
      </div>
      <div className="market-row-list">
        {filteredMarkets.map((market) => (
          <MarketRow key={market.source.id} market={market} totalBetLabel={copy.totalBetAmount} />
        ))}
      </div>
    </section>
  </div>
</main>
```

Add local `MarketSummaryCard` and `MarketRow` components in `page.tsx`:

```tsx
function MarketSummaryCard({ market, totalBetLabel }: { market: DisplayMarket; totalBetLabel: string }) {
  return (
    <article className="market-summary-card">
      <div className="market-card-top">
        <span>{market.category}</span>
        <small>{market.statusLabel}</small>
      </div>
      <h2>
        <Link href={market.href}>{market.title}</Link>
      </h2>
      <div className="compact-odds">
        {market.outcomes.slice(0, 3).map((outcome) => (
          <Link href={getMarketHref(market.source.marketId, outcome.outcomeIndex)} key={outcome.outcomeIndex}>
            <span>{outcome.label}</span>
            <strong>{outcome.priceLabel}</strong>
          </Link>
        ))}
      </div>
      <small>{totalBetLabel}: {market.activityLabel}</small>
    </article>
  );
}

function MarketRow({ market, totalBetLabel }: { market: DisplayMarket; totalBetLabel: string }) {
  return (
    <article className="market-odds-row">
      <div>
        <span className="market-row-status">{market.statusLabel}</span>
        <Link href={market.href}>{market.title}</Link>
        <small>{totalBetLabel}: {market.activityLabel}</small>
      </div>
      <div className="compact-odds">
        {market.outcomes.slice(0, 4).map((outcome) => (
          <Link href={getMarketHref(market.source.marketId, outcome.outcomeIndex)} key={outcome.outcomeIndex}>
            <span>{outcome.label}</span>
            <strong>{outcome.priceLabel}</strong>
          </Link>
        ))}
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Add homepage CSS**

In `apps/web/src/app/globals.css`, add styles for:

```css
.market-home-shell {
  margin: 0 auto;
  max-width: 1320px;
  padding: 32px 24px 56px;
}

.market-home-toolbar {
  align-items: center;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) auto;
  margin-bottom: 28px;
}

.market-home-section + .market-home-section {
  margin-top: 36px;
}

.high-volume-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.market-summary-card,
.market-odds-row {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
}

.market-summary-card {
  display: grid;
  gap: 16px;
  min-height: 180px;
  padding: 18px;
}

.market-summary-card h2,
.market-odds-row a {
  color: #111827;
}

.market-row-list {
  display: grid;
  gap: 12px;
}

.market-odds-row {
  align-items: center;
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 42%);
  padding: 16px 18px;
}

.compact-odds {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
}

.compact-odds a {
  align-items: center;
  background: #f3f4f6;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 12px;
  text-decoration: none;
}

.compact-odds a:hover {
  background: #e8f7ee;
}

@media (max-width: 860px) {
  .market-home-toolbar,
  .market-odds-row {
    grid-template-columns: 1fr;
  }

  .high-volume-grid {
    grid-template-columns: 1fr;
  }
}
```

During this task, keep old CSS classes in place until all pages stop using them.

- [ ] **Step 5: Run homepage tests**

Run:

```bash
npm test --workspace @pmx/web -- src/app/page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/page.test.tsx apps/web/src/app/globals.css apps/web/src/features/i18n/messages.ts
git commit -m "Redesign home market page"
```

---

### Task 4: Category Drilldown Page

**Files:**
- Create: `apps/web/src/app/markets/page.tsx`
- Create: `apps/web/src/features/markets/market-list-page.tsx`
- Create: `apps/web/src/features/markets/market-list-page.test.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Write category page tests**

Create `apps/web/src/features/markets/market-list-page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/language-provider";
import { fetchMarkets } from "./markets-client";
import { MarketListPage } from "./market-list-page";

vi.mock("./markets-client", () => ({
  fetchMarkets: vi.fn()
}));

const fetchMarketsMock = vi.mocked(fetchMarkets);

describe("MarketListPage", () => {
  it("shows a left drilldown only on the category page", async () => {
    fetchMarketsMock.mockResolvedValue([
      {
        id: "sports_1",
        marketId: "sports_1",
        slug: "sports-1",
        question: "WTA: M. Timofeeva vs H. Watson",
        category: "Sports",
        active: true,
        closed: false,
        outcomes: ["Timofeeva", "Watson"],
        outcomePrices: ["0.56", "0.45"],
        volume: "50660",
        liquidity: "1000",
        syncedAt: "2026-06-25T00:00:00.000Z"
      }
    ]);

    render(
      <LanguageProvider>
        <MarketListPage initialCategory="Sports" />
      </LanguageProvider>
    );

    expect(await screen.findByRole("navigation", { name: "盘口分类" })).toBeInTheDocument();
    expect(screen.getByText("WTA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /M. Timofeeva/ })).toBeInTheDocument();
    expect(screen.getByText("Timofeeva")).toBeInTheDocument();
    expect(screen.getByText("56c")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run category test to verify failure**

Run:

```bash
npm test --workspace @pmx/web -- src/features/markets/market-list-page.test.tsx
```

Expected: FAIL because `market-list-page.tsx` does not exist.

- [ ] **Step 3: Implement route wrapper**

Create `apps/web/src/app/markets/page.tsx`:

```tsx
import { MarketListPage } from "../../features/markets/market-list-page";

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { category } = await searchParams;

  return <MarketListPage initialCategory={category ?? "All"} />;
}
```

- [ ] **Step 4: Implement category page**

Create `apps/web/src/features/markets/market-list-page.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../i18n/language-provider";
import { WebTopbar } from "../layout/web-topbar";
import { getMarketHref, sortDisplayMarketsByActivity, toDisplayMarkets, type DisplayMarket } from "./market-display";
import { fetchMarkets, type MarketListItem } from "./markets-client";

interface MarketListPageProps {
  initialCategory: string;
}

const categoryCopy = {
  "zh-CN": {
    all: "全部",
    categoryNav: "盘口分类",
    loading: "正在读取盘口",
    title: "全部盘口",
    totalBetAmount: "总投注额"
  },
  en: {
    all: "All",
    categoryNav: "Market categories",
    loading: "Loading markets",
    title: "All markets",
    totalBetAmount: "Total bet amount"
  }
} as const;

export function MarketListPage({ initialCategory }: MarketListPageProps) {
  const { locale, messages } = useLanguage();
  const text = categoryCopy[locale];
  const [markets, setMarkets] = useState<MarketListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activeGroup, setActiveGroup] = useState(text.all);

  useEffect(() => {
    fetchMarkets()
      .then((items) => {
        setMarkets(items);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const displayMarkets = useMemo(
    () => sortDisplayMarketsByActivity(toDisplayMarkets(markets, locale, messages.home.categoryFallback)),
    [locale, markets, messages.home.categoryFallback]
  );

  const categoryMarkets = useMemo(() => {
    if (initialCategory === "All" || initialCategory === text.all) {
      return displayMarkets;
    }

    return displayMarkets.filter((market) => {
      const rawCategory = market.source.category ?? "";
      return rawCategory.toLowerCase() === initialCategory.toLowerCase() || market.category.toLowerCase() === initialCategory.toLowerCase();
    });
  }, [displayMarkets, initialCategory, text.all]);

  const groups = useMemo(() => buildDrilldownGroups(categoryMarkets, text.all), [categoryMarkets, text.all]);
  const visibleMarkets = activeGroup === text.all
    ? categoryMarkets
    : categoryMarkets.filter((market) => inferDrilldownGroup(market) === activeGroup);

  return (
    <main className="trading-shell polymarket-shell">
      <WebTopbar />
      <div className="market-list-shell">
        <nav aria-label={text.categoryNav} className="market-list-rail">
          {groups.map((group) => (
            <button
              className={group.label === activeGroup ? "active" : ""}
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(group.label)}
            >
              <span>{group.label}</span>
              <small>{group.count}</small>
            </button>
          ))}
        </nav>
        <section className="market-list-main">
          <div className="section-heading">
            <div>
              <h1>{text.title}</h1>
              <span>{status === "loading" ? text.loading : `${visibleMarkets.length}`}</span>
            </div>
          </div>
          <div className="market-row-list">
            {visibleMarkets.map((market) => (
              <CategoryMarketRow key={market.source.id} market={market} totalBetLabel={text.totalBetAmount} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function CategoryMarketRow({ market, totalBetLabel }: { market: DisplayMarket; totalBetLabel: string }) {
  return (
    <article className="market-odds-row">
      <div>
        <span className="market-row-status">{inferDrilldownGroup(market)}</span>
        <Link href={market.href}>{market.title}</Link>
        <small>{totalBetLabel}: {market.activityLabel}</small>
      </div>
      <div className="compact-odds">
        {market.outcomes.slice(0, 4).map((outcome) => (
          <Link href={getMarketHref(market.source.marketId, outcome.outcomeIndex)} key={outcome.outcomeIndex}>
            <span>{outcome.label}</span>
            <strong>{outcome.priceLabel}</strong>
          </Link>
        ))}
      </div>
    </article>
  );
}

function buildDrilldownGroups(markets: DisplayMarket[], allLabel: string): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>([[allLabel, markets.length]]);

  markets.forEach((market) => {
    const label = inferDrilldownGroup(market);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

function inferDrilldownGroup(market: DisplayMarket): string {
  const text = `${market.source.question} ${market.source.slug ?? ""}`.toLowerCase();

  if (text.includes("wta")) return "WTA";
  if (text.includes("atp")) return "ATP";
  if (text.includes("world cup")) return "World Cup";
  if (text.includes("ucl")) return "UCL";
  if (text.includes("mlb")) return "MLB";
  if (text.includes("nhl")) return "NHL";
  if (text.includes("nba")) return "NBA";

  return market.category;
}
```

- [ ] **Step 5: Add category CSS**

In `apps/web/src/app/globals.css`, add:

```css
.market-list-shell {
  display: grid;
  gap: 36px;
  grid-template-columns: 220px minmax(0, 1fr);
  margin: 0 auto;
  max-width: 1320px;
  padding: 32px 24px 56px;
}

.market-list-rail {
  align-self: start;
  display: grid;
  gap: 8px;
  position: sticky;
  top: 96px;
}

.market-list-rail button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 10px;
  color: #4b5563;
  display: flex;
  font-weight: 700;
  justify-content: space-between;
  min-height: 42px;
  padding: 0 14px;
  text-align: left;
}

.market-list-rail button.active,
.market-list-rail button:hover {
  background: #f3f4f6;
  color: #111827;
}

@media (max-width: 860px) {
  .market-list-shell {
    grid-template-columns: 1fr;
  }

  .market-list-rail {
    display: flex;
    overflow-x: auto;
    position: static;
  }
}
```

- [ ] **Step 6: Run category tests**

Run:

```bash
npm test --workspace @pmx/web -- src/features/markets/market-list-page.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/markets/page.tsx apps/web/src/features/markets/market-list-page.tsx apps/web/src/features/markets/market-list-page.test.tsx apps/web/src/app/globals.css
git commit -m "Add category market drilldown page"
```

---

### Task 5: Odds-Only Market Detail With Lazy Ticket

**Files:**
- Modify: `apps/web/src/app/markets/[marketId]/page.tsx`
- Modify: `apps/web/src/features/markets/market-detail-page.tsx`
- Create: `apps/web/src/features/markets/market-detail-page.test.tsx`
- Modify: `apps/web/src/features/trading/order-ticket.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Write detail tests**

Create `apps/web/src/features/markets/market-detail-page.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { appendActivity, appendOrderPreviewActivity } from "../activity/activity-store";
import { LanguageProvider } from "../i18n/language-provider";
import { previewOrder } from "../trading/order-preview-client";
import { MarketDetailPage } from "./market-detail-page";
import { fetchMarkets } from "./markets-client";

vi.mock("./markets-client", () => ({
  fetchMarkets: vi.fn()
}));

vi.mock("../activity/activity-store", () => ({
  appendActivity: vi.fn(),
  appendOrderPreviewActivity: vi.fn()
}));

vi.mock("../trading/order-preview-client", () => ({
  previewOrder: vi.fn().mockResolvedValue({ readiness: { gates: [] } })
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/markets/market_1",
  useRouter: () => ({ replace: vi.fn() })
}));

const fetchMarketsMock = vi.mocked(fetchMarkets);

describe("MarketDetailPage", () => {
  it("shows odds only and opens the ticket after an odd is selected", async () => {
    fetchMarketsMock.mockResolvedValue([
      {
        id: "snapshot_1",
        marketId: "market_1",
        slug: "market-1",
        question: "M. Timofeeva - H. Watson",
        category: "Sports",
        active: true,
        closed: false,
        outcomes: ["Timofeeva", "Watson"],
        outcomePrices: ["0.56", "0.45"],
        volume: "50660",
        liquidity: "2000",
        syncedAt: "2026-06-25T00:00:00.000Z"
      }
    ]);

    render(
      <LanguageProvider>
        <MarketDetailPage initialMarketId="market_1" />
      </LanguageProvider>
    );

    expect(await screen.findByRole("heading", { name: "M. Timofeeva - H. Watson" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "主要盘口" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "市场规则" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "订单票据" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Timofeeva 56c/ }));

    expect(screen.getByRole("heading", { name: "订单票据" })).toBeInTheDocument();
    expect(screen.getByText("Timofeeva")).toBeInTheDocument();
    expect(previewOrder).toHaveBeenCalled();
    expect(appendActivity).toHaveBeenCalled();
    expect(appendOrderPreviewActivity).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run detail test to verify failure**

Run:

```bash
npm test --workspace @pmx/web -- src/features/markets/market-detail-page.test.tsx
```

Expected: FAIL because the current detail page shows info panels and a permanent ticket.

- [ ] **Step 3: Update route query parsing**

Modify `apps/web/src/app/markets/[marketId]/page.tsx` so it passes an optional outcome index:

```tsx
import { MarketDetailPage } from "../../../features/markets/market-detail-page";

interface PageProps {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<{ outcome?: string; side?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { marketId } = await params;
  const { outcome, side } = await searchParams;
  const outcomeIndex = Number(outcome);

  return (
    <MarketDetailPage
      initialMarketId={decodeURIComponent(marketId)}
      initialOutcomeIndex={Number.isInteger(outcomeIndex) && outcomeIndex >= 0 ? outcomeIndex : side === "no" ? 1 : undefined}
    />
  );
}
```

- [ ] **Step 4: Extend `OrderTicket` with outcome-index mode**

In `apps/web/src/features/trading/order-ticket.tsx`, add `outcomeIndex` to preview and a controlled outcome mode:

```ts
export interface OrderTicketPreview extends OrderPreview {
  side: OrderSide;
  outcome: string;
  outcomeIndex: number;
}
```

Change the props union to include:

```ts
| (OrderTicketBaseProps & {
    initialOutcomeIndex?: number;
    onOutcomeIndexChange: (outcomeIndex: number) => void;
    selectedOutcomeIndex: number;
    initialSide?: never;
    onSideChange?: never;
    selectedSide?: never;
  })
```

Change the `OrderTicket` function signature so it receives `props` first:

```ts
export function OrderTicket(props: OrderTicketProps) {
  const {
    locale,
    marketTitle,
    outcomes,
    prices,
    onPreviewChange,
    readinessGates = []
  } = props;
```

Then compute side/outcome state with:

```ts
const controlledSide = "selectedSide" in props ? props.selectedSide : undefined;
const onSideChange = "onSideChange" in props ? props.onSideChange : undefined;
const initialSide = "initialSide" in props ? props.initialSide ?? "yes" : "yes";
const selectedOutcomeIndex = "selectedOutcomeIndex" in props ? props.selectedOutcomeIndex : undefined;
const onOutcomeIndexChange = "onOutcomeIndexChange" in props ? props.onOutcomeIndexChange : undefined;
const initialOutcomeIndex = "initialOutcomeIndex" in props ? props.initialOutcomeIndex : undefined;
const [internalSide, setInternalSide] = useState<OrderSide>(initialSide);
const [internalOutcomeIndex, setInternalOutcomeIndex] = useState(initialOutcomeIndex ?? 0);
const side = controlledSide ?? internalSide;
const controlledOutcomeIndex = "selectedOutcomeIndex" in props ? props.selectedOutcomeIndex : undefined;
const usesOutcomeIndexMode =
  controlledOutcomeIndex !== undefined ||
  onOutcomeIndexChange !== undefined ||
  initialOutcomeIndex !== undefined;
const outcomeIndex = usesOutcomeIndexMode
  ? controlledOutcomeIndex ?? internalOutcomeIndex
  : side === "yes"
    ? 0
    : 1;
const outcome = outcomes[outcomeIndex] ?? outcomes[0] ?? "Outcome";
const price = prices[outcomeIndex] ?? 0;
const previewSide: OrderSide = outcomeIndex === 0 ? "yes" : "no";
```

Update the existing side buttons so they still call `handleSideChange("yes")` and `handleSideChange("no")`. Add `handleOutcomeIndexChange`:

```ts
const handleOutcomeIndexChange = (nextOutcomeIndex: number) => {
  if (selectedOutcomeIndex === undefined) {
    setInternalOutcomeIndex(nextOutcomeIndex);
  }

  onOutcomeIndexChange?.(nextOutcomeIndex);
};
```

When calling `onPreviewChange`, send:

```ts
onPreviewChange?.({
  ...preview,
  side: previewSide,
  outcome,
  outcomeIndex
});
```

Keep existing side mode working for homepage/detail links that still pass `side=yes/no`.

- [ ] **Step 5: Simplify market detail page**

In `apps/web/src/features/markets/market-detail-page.tsx`:

- change props to `initialOutcomeIndex?: number`
- replace `selectedSide` with `selectedOutcomeIndex: number | null`
- render all outcomes from `selectedMarket.outcomes`
- remove `market-info-grid`
- remove always-visible `detail-ticket-pane`
- show `OrderTicket` only when `selectedOutcomeIndex !== null`

Core state:

```ts
const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<number | null>(
  typeof initialOutcomeIndex === "number" ? initialOutcomeIndex : null
);

useEffect(() => {
  setSelectedOutcomeIndex(typeof initialOutcomeIndex === "number" ? initialOutcomeIndex : null);
}, [initialOutcomeIndex, initialMarketId]);
```

Odds button:

```tsx
{selectedMarket.outcomes.map((outcome, index) => (
  <button
    aria-pressed={selectedOutcomeIndex === index}
    className={selectedOutcomeIndex === index ? "market-line-price active" : "market-line-price"}
    key={`${outcome}-${index}`}
    type="button"
    onClick={() => {
      setSelectedOutcomeIndex(index);
      router.replace(`${pathname}?outcome=${index}` as Route, { scroll: false });
    }}
  >
    <span>{outcome}</span>
    <strong>{formatCents(selectedMarket.prices[index] ?? 0)}</strong>
  </button>
))}
```

Conditional ticket:

```tsx
{selectedOutcomeIndex !== null ? (
  <aside className="detail-ticket-pane">
    <OrderTicket
      initialOutcomeIndex={selectedOutcomeIndex}
      locale={locale}
      marketTitle={selectedMarket.question}
      onOutcomeIndexChange={setSelectedOutcomeIndex}
      onPreviewChange={handlePreviewChange}
      outcomes={selectedMarket.outcomes}
      prices={selectedMarket.prices}
      readinessGates={readinessGates}
      selectedOutcomeIndex={selectedOutcomeIndex}
    />
  </aside>
) : null}
```

In `handlePreviewChange`, use `preview.outcomeIndex` for API preview:

```ts
void previewOrder({
  amountUsd: preview.amountUsd,
  marketId: selectedMarket.source.marketId,
  outcomeIndex: preview.outcomeIndex,
  orderType: "FAK"
})
```

- [ ] **Step 6: Add detail CSS**

In `apps/web/src/app/globals.css`, add:

```css
.market-lines {
  display: grid;
  gap: 12px;
}

.market-line-card {
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(180px, 1fr) minmax(260px, 42%);
  padding: 16px 18px;
}

.market-line-prices {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}

.market-line-price {
  align-items: center;
  background: #f3f4f6;
  border: 0;
  border-radius: 10px;
  display: flex;
  font-weight: 800;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 14px;
}

.market-line-price.active,
.market-line-price:hover {
  background: #dcfce7;
}

@media (max-width: 900px) {
  .market-line-card {
    grid-template-columns: 1fr;
  }

  .detail-ticket-pane {
    bottom: 0;
    left: 0;
    position: fixed;
    right: 0;
    z-index: 50;
  }
}
```

- [ ] **Step 7: Run detail tests**

Run:

```bash
npm test --workspace @pmx/web -- src/features/markets/market-detail-page.test.tsx src/features/trading/order-ticket.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/markets/[marketId]/page.tsx apps/web/src/features/markets/market-detail-page.tsx apps/web/src/features/markets/market-detail-page.test.tsx apps/web/src/features/trading/order-ticket.tsx apps/web/src/app/globals.css
git commit -m "Simplify market detail odds flow"
```

---

### Task 6: Personal Positions And PnL UI

**Files:**
- Create: `apps/web/src/features/portfolio/position-ledger-data.ts`
- Create: `apps/web/src/features/portfolio/position-ledger.tsx`
- Create: `apps/web/src/features/portfolio/position-ledger.test.tsx`
- Modify: `apps/web/src/features/auth/account-panel.tsx`
- Modify: `apps/web/src/features/auth/account-panel.test.tsx`
- Modify: `apps/web/src/app/portfolio/page.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Write position ledger tests**

Create `apps/web/src/features/portfolio/position-ledger.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendOrderPreviewActivity } from "../activity/activity-store";
import { LanguageProvider } from "../i18n/language-provider";
import { PositionLedger } from "./position-ledger";

describe("PositionLedger", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders preview-derived active positions and empty history", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("activity_1");
    appendOrderPreviewActivity({
      amountUsd: 10,
      marketTitle: "BTC Up or Down",
      outcome: "Up",
      price: 0.54
    });

    render(
      <LanguageProvider>
        <PositionLedger />
      </LanguageProvider>
    );

    expect(screen.getByRole("heading", { name: "持仓" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "盈亏" })).toBeInTheDocument();
    expect(screen.getByText("BTC Up or Down")).toBeInTheDocument();
    expect(screen.getByText("Up 54c / $10.00")).toBeInTheDocument();
    expect(screen.getByText("暂无历史持仓")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run:

```bash
npm test --workspace @pmx/web -- src/features/portfolio/position-ledger.test.tsx
```

Expected: FAIL because `PositionLedger` does not exist.

- [ ] **Step 3: Implement position data conversion**

Create `apps/web/src/features/portfolio/position-ledger-data.ts`:

```ts
import { readActivity } from "../activity/activity-store";
import type { Locale } from "../i18n/messages";
import { localizeOutcome } from "../markets/market-localization";

export interface PositionRow {
  id: string;
  status: string;
  marketTitle: string;
  detail: string;
  totalAmount: string;
  pnl: string;
}

export function readPreviewPositions(locale: Locale): PositionRow[] {
  return readActivity()
    .filter((item) => item.type === "order.previewed" && item.orderPreview)
    .map((item) => {
      const preview = item.orderPreview!;
      const outcome = localizeOutcome(preview.outcome, locale);

      return {
        id: item.id,
        status: locale === "zh-CN" ? "预览中" : "Preview",
        marketTitle: item.label,
        detail: `${outcome} ${formatCents(preview.price)} / ${formatUsd(preview.amountUsd)}`,
        totalAmount: formatUsd(preview.amountUsd),
        pnl: "$0.00"
      };
    });
}

function formatCents(price: number): string {
  if (!Number.isFinite(price)) {
    return "--";
  }

  return `${Math.round(price * 100)}c`;
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "$0.00";
  }

  return `$${value.toFixed(2)}`;
}
```

- [ ] **Step 4: Implement position ledger component**

Create `apps/web/src/features/portfolio/position-ledger.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/language-provider";
import { readPreviewPositions, type PositionRow } from "./position-ledger-data";

const copy = {
  "zh-CN": {
    active: "生效中",
    emptyActive: "暂无当前持仓",
    emptyHistory: "暂无历史持仓",
    history: "历史持仓",
    market: "盘口",
    pnl: "盈亏",
    positions: "持仓",
    range: "过去 24 小时",
    total: "总交易金额"
  },
  en: {
    active: "Active",
    emptyActive: "No active positions",
    emptyHistory: "No historical positions",
    history: "Historical positions",
    market: "Market",
    pnl: "PnL",
    positions: "Positions",
    range: "Past 24 hours",
    total: "Total amount"
  }
} as const;

export function PositionLedger() {
  const { locale } = useLanguage();
  const text = copy[locale];
  const [positions, setPositions] = useState<PositionRow[]>([]);

  useEffect(() => {
    setPositions(readPreviewPositions(locale));
  }, [locale]);

  return (
    <section className="position-ledger">
      <div className="position-summary-grid">
        <section>
          <span>{text.positions}</span>
          <strong>{positions.length}</strong>
        </section>
        <section>
          <span>{text.pnl}</span>
          <strong>$0.00</strong>
          <small>{text.range}</small>
        </section>
      </div>

      <section className="position-table-section">
        <div className="section-heading">
          <h2>{text.positions}</h2>
          <span>{text.active}</span>
        </div>
        {positions.length > 0 ? <PositionTable rows={positions} copy={text} /> : <p>{text.emptyActive}</p>}
      </section>

      <section className="position-table-section">
        <div className="section-heading">
          <h2>{text.history}</h2>
          <span>{text.pnl}</span>
        </div>
        <p>{text.emptyHistory}</p>
      </section>
    </section>
  );
}

function PositionTable({ rows, copy: text }: { rows: PositionRow[]; copy: (typeof copy)["zh-CN"] | (typeof copy)["en"] }) {
  return (
    <div className="position-table">
      <div className="position-table-head">
        <span>{text.active}</span>
        <span>{text.market}</span>
        <span>{text.total}</span>
        <span>{text.pnl}</span>
      </div>
      {rows.map((row) => (
        <article className="position-row" key={row.id}>
          <span>{row.status}</span>
          <div>
            <strong>{row.marketTitle}</strong>
            <small>{row.detail}</small>
          </div>
          <span>{row.totalAmount}</span>
          <strong>{row.pnl}</strong>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Reuse ledger in account and portfolio**

In `apps/web/src/features/auth/account-panel.tsx`, import `PositionLedger`:

```ts
import { PositionLedger } from "../portfolio/position-ledger";
```

Render it before `WalletPanel`:

```tsx
<PositionLedger />
<WalletPanel />
```

Keep sign-in, loading, and error states unchanged.

In `apps/web/src/app/portfolio/page.tsx`, replace the old `portfolio-grid` and empty panel with:

```tsx
<PositionLedger />
```

and import:

```ts
import { PositionLedger } from "../../features/portfolio/position-ledger";
```

- [ ] **Step 6: Add position CSS**

In `apps/web/src/app/globals.css`, add:

```css
.position-ledger {
  display: grid;
  gap: 24px;
}

.position-summary-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.position-summary-grid section,
.position-table-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 18px;
}

.position-summary-grid span,
.position-summary-grid small,
.position-table-head {
  color: #6b7280;
  font-size: 0.86rem;
  font-weight: 700;
}

.position-summary-grid strong {
  color: #111827;
  display: block;
  font-size: 1.8rem;
  margin-top: 8px;
}

.position-table {
  display: grid;
  gap: 8px;
}

.position-table-head,
.position-row {
  display: grid;
  gap: 16px;
  grid-template-columns: 120px minmax(0, 1fr) 140px 120px;
}

.position-row {
  align-items: center;
  background: #f9fafb;
  border-radius: 12px;
  min-height: 72px;
  padding: 0 16px;
}

@media (max-width: 760px) {
  .position-summary-grid,
  .position-table-head,
  .position-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Run position/account tests**

Run:

```bash
npm test --workspace @pmx/web -- src/features/portfolio/position-ledger.test.tsx src/features/auth/account-panel.test.tsx
```

Expected: PASS after updating account panel assertions that still expect the wallet sections.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/portfolio/position-ledger-data.ts apps/web/src/features/portfolio/position-ledger.tsx apps/web/src/features/portfolio/position-ledger.test.tsx apps/web/src/features/auth/account-panel.tsx apps/web/src/features/auth/account-panel.test.tsx apps/web/src/app/portfolio/page.tsx apps/web/src/app/globals.css
git commit -m "Add personal positions ledger UI"
```

---

### Task 7: Remove Old UI Leftovers And Tighten Responsive Layout

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/features/markets/market-detail-page.tsx`

- [ ] **Step 1: Search for obsolete UI class usage**

Run:

```bash
rg -n "category-rail|ticket-pane|readiness-card|feed-hero|market-category-section|top-market-list" apps/web/src
```

Expected: results only for components that still intentionally use these classes. For the new homepage, `category-rail`, `ticket-pane`, `feed-hero`, `market-category-section`, and `top-market-list` should not appear in `apps/web/src/app/page.tsx`.

- [ ] **Step 2: Delete unused homepage CSS blocks**

In `apps/web/src/app/globals.css`, remove CSS rules that are unused after Task 3:

```text
.category-rail
.ticket-pane
.feed-hero
.market-category-sections
.market-category-section
.top-market-list
.top-market-row
```

Keep any rule still used by `MarketDetailPage`, `OrderTicket`, account pages, or admin pages.

- [ ] **Step 3: Run web lint**

Run:

```bash
npm run lint --workspace @pmx/web
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/page.tsx apps/web/src/features/markets/market-detail-page.tsx
git commit -m "Clean up old market UI styles"
```

---

### Task 8: E2E Coverage And Browser Verification

**Files:**
- Modify: `tests/e2e/home.spec.ts`

- [ ] **Step 1: Update e2e tests**

Replace the first test in `tests/e2e/home.spec.ts` with:

```ts
test("shows the light market homepage", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "高投注额盘口" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "全部盘口" })).toBeVisible();
  await expect(page.getByText("市场分类")).toHaveCount(0);
  await expect(page.getByText("交易准备")).toHaveCount(0);
  await expect(page.getByText("订单预览")).toHaveCount(0);
});
```

Add a category/detail test:

```ts
test("opens category drilldown and lazy order ticket", async ({ page }) => {
  await page.goto("/markets?category=Sports");

  await expect(page.getByRole("navigation", { name: "盘口分类" })).toBeVisible();

  const firstMarket = page.locator(".market-odds-row").first();
  await expect(firstMarket).toBeVisible();
  await firstMarket.getByRole("link").first().click();

  await expect(page.getByRole("heading", { name: "主要盘口" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "订单票据" })).toHaveCount(0);

  await page.locator(".market-line-price").first().click();
  await expect(page.getByRole("heading", { name: "订单票据" })).toBeVisible();
});
```

- [ ] **Step 2: Run full web unit tests**

Run:

```bash
npm test --workspace @pmx/web
```

Expected: PASS.

- [ ] **Step 3: Run web lint**

Run:

```bash
npm run lint --workspace @pmx/web
```

Expected: PASS.

- [ ] **Step 4: Run web build**

Run:

```bash
npm run build --workspace @pmx/web
```

Expected: PASS.

- [ ] **Step 5: Start local dev server for browser checks**

Run:

```bash
npm run dev --workspace @pmx/web
```

Expected: Next.js starts on `http://localhost:3000`. If port 3000 is busy, stop the old process or use the port shown by Next.js.

- [ ] **Step 6: Run e2e tests**

In a second terminal:

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 7: Manual browser checks**

Open these URLs:

- `http://localhost:3000/`
- `http://localhost:3000/markets?category=Sports`
- `http://localhost:3000/account`

Verify:

- homepage has no left sidebar
- homepage first section is high total-bet markets
- homepage second section is all markets
- category page has a left drilldown
- detail page does not show an order ticket until an odd is selected
- account page shows positions and PnL structure
- no horizontal overflow at 390px mobile width

- [ ] **Step 8: Stop dev server**

Stop the server with `Ctrl+C` in the terminal that started it.

- [ ] **Step 9: Commit e2e updates**

```bash
git add tests/e2e/home.spec.ts
git commit -m "Update light market UI e2e coverage"
```

---

### Task 9: Final Verification And Handoff

**Files:**
- No planned code file changes.

- [ ] **Step 1: Run full repository tests**

Run:

```bash
npm test
```

Expected: PASS for all workspaces.

- [ ] **Step 2: Run full repository lint**

Run:

```bash
npm run lint
```

Expected: PASS for all workspaces.

- [ ] **Step 3: Run full repository build**

Run:

```bash
npm run build
```

Expected: PASS for shared, API, web, and admin.

- [ ] **Step 4: Run e2e**

Run:

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 5: Check final diff**

Run:

```bash
git status -sb
git log --oneline --decorate -5
```

Expected: working tree clean after task commits. Latest commits should match the UI tasks in this plan.

- [ ] **Step 6: Handoff summary**

Report:

- homepage changed to no-left-sidebar layout
- category drilldown added at `/markets?category=Sports`
- detail page shows odds and lazy ticket
- account/portfolio positions view added with honest empty/preview states
- tests/lint/build/e2e results
- any data limitations, especially real positions and historical PnL awaiting order/fill reconciliation

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| Homepage has no left list | Task 3, Task 8 |
| Homepage shows high total-bet markets | Task 3, Task 8 |
| Homepage shows all markets | Task 3, Task 8 |
| Category pages keep left drilldown | Task 4, Task 8 |
| Market detail shows all odds and lines | Task 5, Task 8 |
| Order ticket appears only after selecting odds | Task 5, Task 8 |
| Account shows positions and PnL | Task 6, Task 8 |
| Chinese UI copy is complete | Task 2, Task 3, Task 6 |
| Real submit remains gated | Task 5, existing disabled `OrderTicket` gate |
