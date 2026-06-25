"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../features/i18n/language-provider";
import type { HomeMessages } from "../features/i18n/messages";
import { WebTopbar } from "../features/layout/web-topbar";
import {
  localizeMarketCategory,
  localizeMarketQuestion,
  localizeOutcome
} from "../features/markets/market-localization";
import { fetchMarkets, type MarketListItem } from "../features/markets/markets-client";

type MarketStatusKey = "loading" | "connected" | "waiting" | "unavailable";
type ReadinessTone = "pending" | "blocked";
type OrderSide = "yes" | "no";

interface DisplayMarket {
  source: MarketListItem;
  question: string;
  category: string;
  outcomes: string[];
  prices: string[];
}

interface MarketCategoryGroup {
  category: string;
  markets: DisplayMarket[];
}

const CATEGORY_PREVIEW_LIMIT = 4;
const readinessTones: ReadinessTone[] = ["pending", "blocked", "blocked", "pending", "blocked"];

export default function Home() {
  const { locale, messages } = useLanguage();
  const copy = messages.home;
  const [markets, setMarkets] = useState<MarketListItem[]>([]);
  const [marketStatusKey, setMarketStatusKey] = useState<MarketStatusKey>("loading");
  const [activeCategory, setActiveCategory] = useState<string>(copy.all);
  const [query, setQuery] = useState("");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [orderSide, setOrderSide] = useState<OrderSide>("yes");
  const [isRefreshingMarkets, setIsRefreshingMarkets] = useState(false);

  const loadMarkets = useCallback(async () => {
    setIsRefreshingMarkets(true);
    setMarketStatusKey("loading");

    try {
      const items = await fetchMarkets();
      setMarkets(items);
      setMarketStatusKey(items.length > 0 ? "connected" : "waiting");
    } catch {
      setMarketStatusKey("unavailable");
    } finally {
      setIsRefreshingMarkets(false);
    }
  }, []);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    setActiveCategory(copy.all);
  }, [copy.all]);

  const emptyMarket = useMemo(
    () =>
      ({
        id: "empty",
        marketId: "empty",
        conditionId: null,
        clobTokenIds: [],
        enableOrderBook: false,
        slug: null,
        question: copy.emptyMarketQuestion,
        category: copy.emptyMarketCategory,
        active: false,
        closed: false,
        outcomes: ["Yes", "No"],
        outcomePrices: ["0.00", "0.00"],
        volume: null,
        volume24hr: null,
        liquidity: null,
        syncedAt: "",
        quotes: []
      }) satisfies MarketListItem,
    [copy.emptyMarketCategory, copy.emptyMarketQuestion]
  );

  const readiness = [
    { label: copy.registerLogin, value: copy.notLoggedIn },
    { label: copy.walletConnect, value: copy.walletNotConnected },
    { label: copy.depositWallet, value: copy.depositWalletMissing },
    { label: copy.fundingAuth, value: copy.waitingWalletState },
    { label: copy.signOrder, value: copy.realTradingOff }
  ].map((item, index) => ({ ...item, tone: readinessTones[index] }));

  const marketStatus = getMarketStatus(copy, marketStatusKey);
  const displayMarkets = useMemo<DisplayMarket[]>(() => {
    const sourceMarkets = markets.length > 0 ? markets : [emptyMarket];

    return sourceMarkets.map((market) => ({
      source: market,
      question: localizeMarketQuestion(market.question, locale),
      category: localizeMarketCategory(market.category, locale, copy.categoryFallback, market.question),
      outcomes: toStringArray(market.outcomes).map((outcome) => localizeOutcome(outcome, locale)),
      prices: toOutcomePrices(market)
    }));
  }, [copy.categoryFallback, emptyMarket, locale, markets]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    displayMarkets.forEach((market) => {
      counts.set(market.category, (counts.get(market.category) ?? 0) + 1);
    });

    return counts;
  }, [displayMarkets]);

  const categoryOptions = useMemo(() => {
    const configuredCategories: string[] = copy.categories.filter((category) => category !== copy.all);
    const discoveredCategories = Array.from(categoryCounts.keys()).filter(
      (category) => !configuredCategories.includes(category)
    );

    return [copy.all, ...configuredCategories, ...discoveredCategories];
  }, [categoryCounts, copy.all, copy.categories]);

  const filteredMarkets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return displayMarkets.filter((market) => {
      const matchesCategory = activeCategory === copy.all || market.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        market.question.toLowerCase().includes(normalizedQuery) ||
        market.category.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, copy.all, displayMarkets, query]);

  const visibleMarkets = filteredMarkets;
  const isOverviewMode = activeCategory === copy.all && query.trim().length === 0;
  const categoryGroups = useMemo(
    () => groupMarketsByCategory(visibleMarkets, categoryOptions),
    [categoryOptions, visibleMarkets]
  );
  const selectedMarket =
    visibleMarkets.find((market) => market.source.id === selectedMarketId) ??
    visibleMarkets[0] ??
    displayMarkets[0]!;
  const selectedSideIndex = orderSide === "yes" ? 0 : 1;
  const selectedOutcome = selectedMarket.outcomes[selectedSideIndex] ?? localizeOutcome(orderSide === "yes" ? "Yes" : "No", locale);
  const selectedPrice = selectedMarket.prices[selectedSideIndex] ?? "0";
  const selectedPriceCents = `${toCents(selectedPrice)}c`;
  const renderMarketCard = (market: DisplayMarket) => (
    <article
      className={market.source.id === selectedMarket.source.id ? "market-card selected" : "market-card"}
      key={market.source.id}
    >
      <div className="market-card-top">
        <span>{market.category}</span>
        <small>{market.source.active && !market.source.closed ? copy.open : copy.readOnlyPreview}</small>
      </div>
      <h3>
        <Link href={getMarketHref(market.source.marketId)}>{market.question}</Link>
      </h3>
      <div className="market-meta">
        <span>{copy.volume}: {formatUsd(market.source.volume)}</span>
        <span>{copy.liquidity}: {formatUsd(market.source.liquidity)}</span>
        <span>{locale === "zh-CN" ? "最后同步" : "Last sync"}: {formatDateTime(market.source.syncedAt, locale)}</span>
      </div>
      <div className="outcome-buttons" aria-label={copy.orderDirection}>
        <Link
          className={
            market.source.id === selectedMarket.source.id && orderSide === "yes"
              ? "yes active"
              : "yes"
          }
          href={getMarketHref(market.source.marketId, "yes")}
        >
          {market.outcomes[0] ?? localizeOutcome("Yes", locale)} {market.prices[0] ? `${toCents(market.prices[0])}c` : "--"}
        </Link>
        <Link
          className={
            market.source.id === selectedMarket.source.id && orderSide === "no"
              ? "no active"
              : "no"
          }
          href={getMarketHref(market.source.marketId, "no")}
        >
          {market.outcomes[1] ?? localizeOutcome("No", locale)} {market.prices[1] ? `${toCents(market.prices[1])}c` : "--"}
        </Link>
      </div>
    </article>
  );

  return (
    <main className="trading-shell polymarket-shell">
      <WebTopbar />

      <div className="polymarket-workspace">
        <aside className="category-rail" aria-label={copy.categoryFallback}>
          <div className="rail-title">
            <span>{copy.filterEyebrow}</span>
            <strong>{copy.filterTitle}</strong>
          </div>
          <div className="category-list">
            {categoryOptions.map((category) => {
              const count = category === copy.all ? displayMarkets.length : categoryCounts.get(category) ?? 0;

              return (
              <button
                className={category === activeCategory ? "category-button active" : "category-button"}
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                <span>{category}</span>
                <small>{formatMarketCount(count, locale)}</small>
              </button>
              );
            })}
          </div>
          <div className="rail-status">
            <span>{copy.marketSync}</span>
            <strong>{marketStatus}</strong>
            <small>{copy.backendSyncHint}</small>
          </div>
        </aside>

        <section className="market-feed">
          <div className="feed-hero">
            <div>
              <span className="eyebrow">{copy.heroEyebrow}</span>
              <h1>{copy.heroTitle}</h1>
              <p>{copy.heroDescription}</p>
            </div>
            <span className="status-pill">{copy.previewOnly}</span>
          </div>

          <label className="market-search">
            <span>{copy.searchLabel}</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              value={query}
            />
          </label>

          <section className="feed-section" aria-labelledby="featured-markets-heading">
            <div className="section-heading">
              <div>
                <h2 id="featured-markets-heading">{isOverviewMode ? copy.overviewTitle : copy.filteredResults}</h2>
                <span>{isOverviewMode ? marketStatus : formatMarketCount(visibleMarkets.length, locale)}</span>
              </div>
              <button type="button" disabled={isRefreshingMarkets} onClick={loadMarkets}>
                {copy.syncPublicMarkets}
              </button>
            </div>

            {visibleMarkets.length === 0 ? (
              <div className="empty-market-results">
                <p>{copy.noMarketResults}</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(copy.all);
                    setQuery("");
                  }}
                >
                  {copy.clearFilters}
                </button>
              </div>
            ) : isOverviewMode ? (
              <div className="market-category-sections">
                {categoryGroups.map((group) => {
                  const previewMarkets = group.markets.slice(0, CATEGORY_PREVIEW_LIMIT);

                  return (
                    <section className="market-category-section" key={group.category}>
                      <div className="category-section-heading">
                        <div>
                          <h3>{group.category}</h3>
                          <span>{formatGroupSummary(group.markets.length, previewMarkets.length, locale)}</span>
                        </div>
                        {group.markets.length > CATEGORY_PREVIEW_LIMIT ? (
                          <button type="button" onClick={() => setActiveCategory(group.category)}>
                            {copy.groupAction}
                          </button>
                        ) : null}
                      </div>
                      <div className="market-card-grid">
                        {previewMarkets.map(renderMarketCard)}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="market-card-grid">
                {visibleMarkets.map(renderMarketCard)}
              </div>
            )}
          </section>

          <section className="feed-section compact-list" aria-labelledby="top-markets-heading">
            <div className="section-heading">
              <h2 id="top-markets-heading">{copy.detailTitle}</h2>
              <span>{copy.readOnlyMarket}</span>
            </div>
            <div className="top-market-list">
              {visibleMarkets.slice(0, 5).map((market) => (
                <Link
                  className={market.source.id === selectedMarket.source.id ? "top-market-row active" : "top-market-row"}
                  key={market.source.id}
                  href={getMarketHref(market.source.marketId)}
                >
                  <span>{market.category}</span>
                  <strong>{market.question}</strong>
                  <small>
                    {(market.outcomes[0] ?? localizeOutcome("Yes", locale))} {market.prices[0] ? `${toCents(market.prices[0])}c` : "--"}
                  </small>
                </Link>
              ))}
            </div>
          </section>
        </section>

        <aside className="ticket-pane">
          <section className="ticket-card">
            <div className="section-heading">
              <h2>{copy.orderPreview}</h2>
              <span>{copy.notSubmittable}</span>
            </div>

            <div className="ticket-toggle" aria-label={copy.orderDirection}>
              <button
                className={orderSide === "yes" ? "active" : ""}
                type="button"
                onClick={() => setOrderSide("yes")}
              >
                {copy.buyVerb} {selectedMarket.outcomes[0] ?? localizeOutcome("Yes", locale)}
              </button>
              <button
                className={orderSide === "no" ? "active" : ""}
                type="button"
                onClick={() => setOrderSide("no")}
              >
                {copy.buyVerb} {selectedMarket.outcomes[1] ?? localizeOutcome("No", locale)}
              </button>
            </div>

            <div className="ticket-market">
              <span>{selectedMarket.category}</span>
              <strong>{selectedMarket.question}</strong>
            </div>

            <dl className="ticket-lines">
              <div>
                <dt>{copy.outcomes}</dt>
                <dd>{selectedOutcome}</dd>
              </div>
              <div>
                <dt>{copy.price}</dt>
                <dd>{selectedPriceCents}</dd>
              </div>
              <div>
                <dt>{copy.quantity}</dt>
                <dd>{copy.quantityValue}</dd>
              </div>
              <div>
                <dt>{copy.estimatedCost}</dt>
                <dd>{formatEstimatedCost(selectedPrice)}</dd>
              </div>
              <div>
                <dt>{copy.route}</dt>
                <dd>{copy.routeValue}</dd>
              </div>
            </dl>

            <div className="risk-note">{copy.riskNote}</div>
            <button className="gate-button" type="button" disabled>
              {copy.gate}
            </button>
          </section>

          <section className="ticket-card readiness-card">
            <div className="section-heading">
              <h2>{copy.readinessTitle}</h2>
              <span>{copy.steps}</span>
            </div>
            <ol className="readiness-list">
              {readiness.map((item, index) => (
                <li className={item.tone} key={item.label}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.value}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}

function getMarketStatus(copy: HomeMessages, status: MarketStatusKey): string {
  if (status === "connected") {
    return copy.apiConnected;
  }

  if (status === "waiting") {
    return copy.waitingMarketSync;
  }

  if (status === "unavailable") {
    return copy.marketApiUnavailable;
  }

  return copy.loadingApi;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function toOutcomePrices(market: MarketListItem): string[] {
  const gammaPrices = toStringArray(market.outcomePrices);
  const quotes = market.quotes ?? [];
  const maxQuoteIndex = Math.max(-1, ...quotes.map((quote) => quote.outcomeIndex));
  const maxLength = Math.max(gammaPrices.length, maxQuoteIndex + 1);

  return Array.from({ length: maxLength }, (_, index) => {
    const quote = quotes.find((item) => item.outcomeIndex === index);

    return quote?.bestAsk ?? quote?.midpoint ?? gammaPrices[index] ?? "0";
  });
}

function groupMarketsByCategory(markets: DisplayMarket[], categoryOptions: string[]): MarketCategoryGroup[] {
  const groups = new Map<string, DisplayMarket[]>();
  markets.forEach((market) => {
    const group = groups.get(market.category) ?? [];
    group.push(market);
    groups.set(market.category, group);
  });

  const orderedCategories = [
    ...categoryOptions.filter((category) => groups.has(category)),
    ...Array.from(groups.keys()).filter((category) => !categoryOptions.includes(category))
  ];

  return orderedCategories
    .filter((category) => category !== categoryOptions[0])
    .map((category) => ({ category, markets: groups.get(category) ?? [] }))
    .filter((group) => group.markets.length > 0);
}

function toCents(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }

  return Math.round(numeric * 100).toString();
}

function formatUsd(value: string | null): string {
  if (!value) {
    return "--";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }

  return `$${Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(numeric)}`;
}

function formatEstimatedCost(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }

  return `$${(numeric * 100).toFixed(2)}`;
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric"
  }).format(date);
}

function formatMarketCount(count: number, locale: string): string {
  if (locale === "zh-CN") {
    return `${count} 个市场`;
  }

  return count === 1 ? "1 market" : `${count} markets`;
}

function formatGroupSummary(totalCount: number, visibleCount: number, locale: string): string {
  if (locale === "zh-CN") {
    return visibleCount < totalCount ? `${totalCount} 个市场，先显示 ${visibleCount} 个` : `${totalCount} 个市场`;
  }

  const totalLabel = formatMarketCount(totalCount, locale);
  return visibleCount < totalCount ? `${totalLabel}, showing ${visibleCount}` : totalLabel;
}

function getMarketHref(marketId: string, side?: OrderSide): Route {
  const baseHref = `/markets/${encodeURIComponent(marketId)}`;

  return (side ? `${baseHref}?side=${side}` : baseHref) as Route;
}
