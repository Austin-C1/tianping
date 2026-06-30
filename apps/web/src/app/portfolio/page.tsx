"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../features/i18n/language-provider";
import { WebTopbar } from "../../features/layout/web-topbar";
import {
  emptyPortfolio,
  fetchPortfolio,
  type PortfolioPosition,
  type PortfolioResponse,
  type PortfolioTrade
} from "../../features/portfolio/portfolio-client";

const copy = {
  "zh-CN": {
    available: "$0.00",
    balance: "可用余额",
    deposit: "Deposit Wallet",
    depositStatus: "未创建",
    eyebrow: "账户资产",
    noTrades: "暂无 paper 成交",
    positions: "持仓",
    positionsEmpty: "暂无持仓",
    recentTrades: "最近 paper 成交",
    title: "投资组合",
    unrealized: "未实现收益",
    wallet: "钱包",
    walletStatus: "未连接"
  },
  en: {
    available: "$0.00",
    balance: "Available balance",
    deposit: "Deposit Wallet",
    depositStatus: "Not created",
    eyebrow: "Account assets",
    noTrades: "No paper trades yet",
    positions: "Positions",
    positionsEmpty: "No positions yet",
    recentTrades: "Recent paper trades",
    title: "Portfolio",
    unrealized: "Unrealized P/L",
    wallet: "Wallet",
    walletStatus: "Not connected"
  }
} as const;

export default function PortfolioPage() {
  const { locale } = useLanguage();
  const text = copy[locale];
  const [portfolio, setPortfolio] = useState<PortfolioResponse>(emptyPortfolio);

  useEffect(() => {
    let mounted = true;

    fetchPortfolio()
      .then((nextPortfolio) => {
        if (mounted) {
          setPortfolio(nextPortfolio);
        }
      })
      .catch(() => {
        if (mounted) {
          setPortfolio(emptyPortfolio);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main>
      <WebTopbar />
      <div className="shell portfolio-shell">
        <div className="eyebrow">{text.eyebrow}</div>
        <h1>{text.title}</h1>

        <section className="portfolio-grid">
          <Metric title={text.balance} value={text.available} />
          <Metric title={text.wallet} value={text.walletStatus} />
          <Metric title={text.deposit} value={text.depositStatus} />
          <Metric title={text.unrealized} value="$0.00" />
        </section>

        <section className="panel portfolio-positions">
          <h2>{text.positions}</h2>
          {portfolio.positions.length > 0 ? (
            <div className="portfolio-list">
              {portfolio.positions.map((position) => (
                <PositionRow key={position.id} locale={locale} position={position} />
              ))}
            </div>
          ) : (
            <p>{text.positionsEmpty}</p>
          )}
        </section>

        <section className="panel portfolio-positions">
          <h2>{text.recentTrades}</h2>
          {portfolio.trades.length > 0 ? (
            <div className="portfolio-list">
              {portfolio.trades.map((trade) => (
                <TradeRow key={trade.id} locale={locale} trade={trade} />
              ))}
            </div>
          ) : (
            <p>{text.noTrades}</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <section>
      <span>{title}</span>
      <strong>{value}</strong>
    </section>
  );
}

function PositionRow({
  locale,
  position
}: {
  locale: "zh-CN" | "en";
  position: PortfolioPosition;
}) {
  return (
    <article className="portfolio-row">
      <div>
        <strong>{position.market?.question ?? "-"}</strong>
        <span>{position.outcome}</span>
      </div>
      <div>
        <strong>{formatShares(position.size, locale)}</strong>
        <span>{formatCents(position.averagePrice)} avg</span>
      </div>
    </article>
  );
}

function TradeRow({ locale, trade }: { locale: "zh-CN" | "en"; trade: PortfolioTrade }) {
  return (
    <article className="portfolio-row">
      <div>
        <strong>{trade.market?.question ?? "-"}</strong>
        <span>{trade.clobTradeId ?? trade.orderId ?? trade.id}</span>
      </div>
      <div>
        <strong>{formatTradeSummary(trade, locale)}</strong>
        <span>{formatDate(trade.executedAt, locale)}</span>
      </div>
    </article>
  );
}

function formatTradeSummary(trade: PortfolioTrade, locale: "zh-CN" | "en"): string {
  const action = trade.side === "BUY" ? (locale === "zh-CN" ? "买入" : "Buy") : "Sell";

  return `${action} ${formatPlainNumber(trade.size)} @ ${formatCents(trade.price)}`;
}

function formatShares(value: string, locale: "zh-CN" | "en"): string {
  const formatted = formatPlainNumber(value);
  return locale === "zh-CN" ? `${formatted} 份` : `${formatted} shares`;
}

function formatPlainNumber(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}

function formatCents(value: string): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}c` : value;
}

function formatDate(value: string, locale: "zh-CN" | "en"): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
}
