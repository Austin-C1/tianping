"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../features/i18n/language-provider";
import type { HomeMessages } from "../features/i18n/messages";
import { WebTopbar } from "../features/layout/web-topbar";
import { fetchMarkets, type MarketListItem } from "../features/markets/markets-client";

type MarketStatusKey = "loading" | "connected" | "waiting" | "unavailable";
type ReadinessTone = "pending" | "blocked";

const readinessTones: ReadinessTone[] = ["pending", "blocked", "blocked", "pending", "blocked"];

export default function Home() {
  const { messages } = useLanguage();
  const copy = messages.home;
  const [markets, setMarkets] = useState<MarketListItem[]>([]);
  const [marketStatusKey, setMarketStatusKey] = useState<MarketStatusKey>("loading");

  useEffect(() => {
    fetchMarkets()
      .then((items) => {
        setMarkets(items);
        setMarketStatusKey(items.length > 0 ? "connected" : "waiting");
      })
      .catch(() => setMarketStatusKey("unavailable"));
  }, []);

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
  const displayMarkets = markets.length > 0 ? markets : [emptyMarket];
  const selectedMarket = displayMarkets[0];
  const selectedOutcomes = useMemo(() => toStringArray(selectedMarket.outcomes), [selectedMarket]);
  const selectedPrices = useMemo(() => toStringArray(selectedMarket.outcomePrices), [selectedMarket]);
  const yesPrice = selectedPrices[0] ? `${toCents(selectedPrices[0])}c` : "--";
  const noPrice = selectedPrices[1] ? `${toCents(selectedPrices[1])}c` : "--";

  return (
    <main className="trading-shell">
      <WebTopbar />

      <div className="trading-workspace">
        <aside className="filter-pane" aria-label={copy.filterTitle}>
          <div className="pane-heading">
            <span className="eyebrow">{copy.filterEyebrow}</span>
            <h2>{copy.filterTitle}</h2>
          </div>

          <label className="field">
            {copy.searchLabel}
            <input placeholder={copy.searchPlaceholder} />
          </label>

          <div className="filter-group" aria-label={copy.categoryFallback}>
            {copy.categories.map((category) => (
              <button
                className={category === copy.all ? "filter-chip active" : "filter-chip"}
                key={category}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>

          <div className="filter-block">
            <span className="filter-title">{copy.dataStatus}</span>
            <label>
              <input defaultChecked type="checkbox" />
              {copy.readOnlyMarket}
            </label>
            <label>
              <input defaultChecked type="checkbox" />
              {copy.orderPreviewReady}
            </label>
            <label>
              <input type="checkbox" />
              {copy.clobSynced}
            </label>
          </div>

          <div className="sync-state">
            <span>{copy.marketSync}</span>
            <strong>{marketStatus}</strong>
            <small>{copy.backendSyncHint}</small>
          </div>
        </aside>

        <section className="market-pane">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">{copy.heroEyebrow}</span>
              <h1>{copy.heroTitle}</h1>
              <p>{copy.heroDescription}</p>
            </div>
            <span className="status-pill">{copy.previewOnly}</span>
          </div>

          <div className="market-toolbar">
            <div>
              <h2>{copy.overviewTitle}</h2>
              <span>{marketStatus}</span>
            </div>
            <button type="button">{copy.syncPublicMarkets}</button>
          </div>

          <div className="market-list" aria-label={copy.overviewTitle}>
            {displayMarkets.map((market, index) => {
              const prices = toStringArray(market.outcomePrices);
              return (
                <article className={index === 0 ? "market-row selected" : "market-row"} key={market.id}>
                  <div className="market-main">
                    <span>{market.category ?? copy.categoryFallback}</span>
                    <strong>{market.question}</strong>
                    <small>{market.active && !market.closed ? copy.open : copy.readOnlyPreview}</small>
                  </div>
                  <div className="market-price">
                    <span>Yes {prices[0] ? `${toCents(prices[0])}c` : "--"}</span>
                    <small>No {prices[1] ? `${toCents(prices[1])}c` : "--"}</small>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="market-detail" aria-labelledby="market-detail-heading">
            <div className="section-heading">
              <h2 id="market-detail-heading">{copy.detailTitle}</h2>
              <span>{selectedMarket.category ?? copy.categoryFallback}</span>
            </div>
            <div className="detail-grid">
              <div>
                <span>{copy.question}</span>
                <strong>{selectedMarket.question}</strong>
              </div>
              <div>
                <span>{copy.outcomes}</span>
                <strong>{selectedOutcomes.join(" / ") || copy.waitingSync}</strong>
              </div>
              <div>
                <span>{copy.volume}</span>
                <strong>{formatUsd(selectedMarket.volume)}</strong>
              </div>
              <div>
                <span>{copy.liquidity}</span>
                <strong>{formatUsd(selectedMarket.liquidity)}</strong>
              </div>
            </div>
          </section>
        </section>

        <aside className="trade-pane">
          <section className="rail-panel">
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

          <section className="rail-panel order-preview">
            <div className="section-heading">
              <h2>{copy.orderPreview}</h2>
              <span>{copy.notSubmittable}</span>
            </div>

            <div className="order-controls" aria-label={copy.orderDirection}>
              <button className="active" type="button">
                {copy.buyYes}
              </button>
              <button type="button">{copy.buyNo}</button>
            </div>

            <dl>
              <div>
                <dt>{copy.market}</dt>
                <dd>{selectedMarket.question}</dd>
              </div>
              <div>
                <dt>{copy.price}</dt>
                <dd>{yesPrice}</dd>
              </div>
              <div>
                <dt>{copy.quantity}</dt>
                <dd>{copy.quantityValue}</dd>
              </div>
              <div>
                <dt>{copy.estimatedCost}</dt>
                <dd>{yesPrice === "--" ? "--" : "$52.00"}</dd>
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
