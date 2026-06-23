"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    fetchMarkets()
      .then((items) => {
        setMarkets(items);
        setMarketStatusKey(items.length > 0 ? "connected" : "waiting");
      })
      .catch(() => setMarketStatusKey("unavailable"));
  }, []);

  useEffect(() => {
    setActiveCategory(copy.all);
  }, [copy.all]);

  const emptyMarket = useMemo(
    () =>
      ({
        id: "empty",
        marketId: "empty",
        slug: null,
        question: copy.emptyMarketQuestion,
        category: copy.emptyMarketCategory,
        active: false,
        closed: false,
        outcomes: ["Yes", "No"],
        outcomePrices: ["0.00", "0.00"],
        volume: null,
        liquidity: null,
        syncedAt: ""
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
      category: localizeMarketCategory(market.category, locale, copy.categoryFallback),
      outcomes: toStringArray(market.outcomes).map((outcome) => localizeOutcome(outcome, locale)),
      prices: toStringArray(market.outcomePrices)
    }));
  }, [copy.categoryFallback, emptyMarket, locale, markets]);

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

  const visibleMarkets = filteredMarkets.length > 0 ? filteredMarkets : displayMarkets;
  const selectedMarket =
    visibleMarkets.find((market) => market.source.id === selectedMarketId) ??
    visibleMarkets[0] ??
    displayMarkets[0]!;
  const selectedSideIndex = orderSide === "yes" ? 0 : 1;
  const selectedOutcome = selectedMarket.outcomes[selectedSideIndex] ?? localizeOutcome(orderSide === "yes" ? "Yes" : "No", locale);
  const selectedPrice = selectedMarket.prices[selectedSideIndex] ?? "0";
  const selectedPriceCents = `${toCents(selectedPrice)}c`;

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
            {copy.categories.map((category) => (
              <button
                className={category === activeCategory ? "category-button active" : "category-button"}
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
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
                <h2 id="featured-markets-heading">{copy.overviewTitle}</h2>
                <span>{marketStatus}</span>
              </div>
              <button type="button">{copy.syncPublicMarkets}</button>
            </div>

            <div className="market-card-grid">
              {visibleMarkets.slice(0, 6).map((market) => (
                <article
                  className={market.source.id === selectedMarket.source.id ? "market-card selected" : "market-card"}
                  key={market.source.id}
                >
                  <div className="market-card-top">
                    <span>{market.category}</span>
                    <small>{market.source.active && !market.source.closed ? copy.open : copy.readOnlyPreview}</small>
                  </div>
                  <h3>{market.question}</h3>
                  <div className="market-meta">
                    <span>{copy.volume}: {formatUsd(market.source.volume)}</span>
                    <span>{copy.liquidity}: {formatUsd(market.source.liquidity)}</span>
                  </div>
                  <div className="outcome-buttons" aria-label={copy.orderDirection}>
                    <button
                      className={
                        market.source.id === selectedMarket.source.id && orderSide === "yes"
                          ? "yes active"
                          : "yes"
                      }
                      type="button"
                      onClick={() => {
                        setSelectedMarketId(market.source.id);
                        setOrderSide("yes");
                      }}
                    >
                      {market.outcomes[0] ?? localizeOutcome("Yes", locale)} {market.prices[0] ? `${toCents(market.prices[0])}c` : "--"}
                    </button>
                    <button
                      className={
                        market.source.id === selectedMarket.source.id && orderSide === "no"
                          ? "no active"
                          : "no"
                      }
                      type="button"
                      onClick={() => {
                        setSelectedMarketId(market.source.id);
                        setOrderSide("no");
                      }}
                    >
                      {market.outcomes[1] ?? localizeOutcome("No", locale)} {market.prices[1] ? `${toCents(market.prices[1])}c` : "--"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="feed-section compact-list" aria-labelledby="top-markets-heading">
            <div className="section-heading">
              <h2 id="top-markets-heading">{copy.detailTitle}</h2>
              <span>{copy.readOnlyMarket}</span>
            </div>
            <div className="top-market-list">
              {visibleMarkets.slice(0, 5).map((market) => (
                <button
                  className={market.source.id === selectedMarket.source.id ? "top-market-row active" : "top-market-row"}
                  key={market.source.id}
                  type="button"
                  onClick={() => setSelectedMarketId(market.source.id)}
                >
                  <span>{market.category}</span>
                  <strong>{market.question}</strong>
                  <small>
                    {(market.outcomes[0] ?? localizeOutcome("Yes", locale))} {market.prices[0] ? `${toCents(market.prices[0])}c` : "--"}
                  </small>
                </button>
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
