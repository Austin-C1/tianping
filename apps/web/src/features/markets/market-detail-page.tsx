"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appendActivity, appendOrderPreviewActivity } from "../activity/activity-store";
import { useLanguage } from "../i18n/language-provider";
import type { Locale } from "../i18n/messages";
import { WebTopbar } from "../layout/web-topbar";
import {
  OrderTicket,
  type OrderReadinessGate,
  type OrderSide,
  type OrderTicketPreview
} from "../trading/order-ticket";
import {
  createSigningIntent,
  previewOrder,
  saveSignedOrder,
  submitOrder
} from "../trading/order-preview-client";
import {
  localizeMarketCategory,
  localizeMarketQuestion,
  localizeOutcome
} from "./market-localization";
import { fetchMarkets, type MarketListItem } from "./markets-client";

interface MarketDetailPageProps {
  initialMarketId: string;
  initialSide?: OrderSide;
}

interface DisplayMarket {
  source: MarketListItem;
  question: string;
  category: string;
  outcomes: string[];
  prices: number[];
}

interface PaperOrderStatus {
  detail?: string;
  label: string;
}

const copy = {
  "zh-CN": {
    apiConnected: "API 已连接",
    back: "返回市场",
    empty: "没有找到这个市场，请返回市场列表重新选择。",
    liquidity: "流动性",
    loading: "正在读取市场详情",
    marketDetails: "市场详情",
    marketRules: "市场规则",
    marketRulesBody: "当前阶段只展示公开市场数据和订单预览，不提交真实 CLOB 订单。",
    orderBook: "盘口",
    paperFailed: "提交失败",
    paperFailedDetail: "paper 提交流程失败，请重新预览后再试。",
    paperLoginRequired: "需要登录后才能提交 paper 订单。",
    paperPreviewed: "已预览",
    paperReadyDetail: "订单 {orderId} 已准备好 paper 提交",
    paperSigning: "签名中",
    paperSigningDetail: "正在创建 paper 签名",
    paperSubmitted: "已提交",
    paperSubmittedAs: "Paper 编号",
    previewOnly: "仅预览",
    readiness: "交易准备",
    route: "签名路径",
    routeValue: "用户钱包签名 → API 校验 → CLOB",
    selected: "已选择",
    status: "开放",
    statusLabel: "状态",
    subtitle: "选择一个结果，输入金额，先检查订单票据和风控 Gate。",
    volume: "成交量",
    wallet: "钱包状态",
    walletBody: "钱包未连接，Deposit Wallet 未创建，真实交易关闭。"
  },
  en: {
    apiConnected: "API connected",
    back: "Back to markets",
    empty: "This market was not found. Return to the market list and choose again.",
    liquidity: "Liquidity",
    loading: "Loading market details",
    marketDetails: "Market details",
    marketRules: "Market rules",
    marketRulesBody: "This stage only shows public market data and order previews. It does not submit real CLOB orders.",
    orderBook: "Order book",
    paperFailed: "Submit failed",
    paperFailedDetail: "The paper submit flow failed. Preview the order again and retry.",
    paperLoginRequired: "Sign in before submitting a paper order.",
    paperPreviewed: "Previewed",
    paperReadyDetail: "Order {orderId} is ready for paper submit",
    paperSigning: "Signing",
    paperSigningDetail: "Creating paper signature",
    paperSubmitted: "Submitted",
    paperSubmittedAs: "Submitted as",
    previewOnly: "Preview only",
    readiness: "Trade readiness",
    route: "Signing route",
    routeValue: "User wallet signature → API validation → CLOB",
    selected: "Selected",
    status: "Open",
    statusLabel: "Status",
    subtitle: "Choose an outcome, enter an amount, then check the order ticket and risk Gate.",
    volume: "Volume",
    wallet: "Wallet status",
    walletBody: "Wallet not connected, Deposit Wallet not created, and real trading is disabled."
  }
} as const;

export function MarketDetailPage({ initialMarketId, initialSide = "yes" }: MarketDetailPageProps) {
  const { locale } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const text = copy[locale];
  const [markets, setMarkets] = useState<MarketListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedSide, setSelectedSide] = useState<OrderSide>(initialSide);
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);
  const [paperStatus, setPaperStatus] = useState<PaperOrderStatus | undefined>();
  const [isPaperSubmitting, setIsPaperSubmitting] = useState(false);
  const [readinessGates, setReadinessGates] = useState<OrderReadinessGate[]>([]);
  const lastActivityKey = useRef("");

  useEffect(() => {
    fetchMarkets()
      .then((items) => {
        setMarkets(items);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const displayMarkets = useMemo(
    () =>
      markets.map((market) => toDisplayMarket(market, locale)),
    [locale, markets]
  );
  const selectedMarket = displayMarkets.find(
    (market) =>
      market.source.marketId === initialMarketId ||
      market.source.id === initialMarketId ||
      market.source.slug === initialMarketId
  );
  const tradableOutcomes = selectedMarket?.outcomes.slice(0, 2) ?? [];
  const tradablePrices = selectedMarket?.prices.slice(0, 2) ?? [];

  useEffect(() => {
    setSelectedSide(initialSide);
    setPreviewOrderId(null);
    setPaperStatus(undefined);
    setReadinessGates([]);
  }, [initialSide, initialMarketId]);

  useEffect(() => {
    if (!selectedMarket) {
      return;
    }

    const key = `market.viewed:${selectedMarket.source.marketId}`;
    if (lastActivityKey.current === key) {
      return;
    }

    lastActivityKey.current = key;
    appendActivity({
      type: "market.viewed",
      label: selectedMarket.question,
      description: text.marketDetails
    });
  }, [selectedMarket, text.marketDetails]);

  const handlePreviewChange = useCallback(
    (preview: OrderTicketPreview) => {
      if (!selectedMarket || preview.amountUsd <= 0) {
        return;
      }

      const outcomeIndex = preview.side === "yes" ? 0 : 1;
      const key = `order.previewed:${selectedMarket.source.marketId}:${preview.side}:${preview.amountUsd}:${preview.price}`;
      if (lastActivityKey.current === key) {
        return;
      }

      lastActivityKey.current = key;
      appendOrderPreviewActivity({
        amountUsd: preview.amountUsd,
        marketTitle: selectedMarket.question,
        outcome: preview.outcome,
        price: preview.price
      });
      void previewOrder({
        amountUsd: preview.amountUsd,
        marketId: selectedMarket.source.marketId,
        outcomeIndex,
        orderType: "FAK"
      })
        .then((response) => {
          if (response?.id) {
            setPreviewOrderId(response.id);
            setPaperStatus({
              label: text.paperPreviewed,
              detail: text.paperReadyDetail.replace("{orderId}", response.id)
            });
          }

          if (response?.readiness?.gates) {
            setReadinessGates(response.readiness.gates);
          }
        })
        .catch(() => undefined);
    },
    [selectedMarket, text.paperPreviewed, text.paperReadyDetail]
  );

  const handlePaperSubmit = useCallback(async () => {
    if (!previewOrderId) {
      return;
    }

    setIsPaperSubmitting(true);
    setPaperStatus({
      label: text.paperSigning,
      detail: text.paperSigningDetail
    });

    try {
      const signingIntent = await createSigningIntent({ orderId: previewOrderId });
      if (!signingIntent) {
        setPaperStatus({
          label: text.paperFailed,
          detail: text.paperLoginRequired
        });
        return;
      }

      const signedOrder = await saveSignedOrder({
        orderId: signingIntent.id,
        signedPayload: {
          mode: "paper",
          signature: `paper-signature-${signingIntent.id}`,
          signingPayload: signingIntent.signingPayload
        }
      });
      if (!signedOrder) {
        setPaperStatus({
          label: text.paperFailed,
          detail: text.paperLoginRequired
        });
        return;
      }

      const submittedOrder = await submitOrder({ orderId: signedOrder.id });
      if (!submittedOrder) {
        setPaperStatus({
          label: text.paperFailed,
          detail: text.paperLoginRequired
        });
        return;
      }

      setPaperStatus({
        label: text.paperSubmitted,
        detail: `${text.paperSubmittedAs} ${submittedOrder.clobOrderId ?? submittedOrder.id}`
      });
    } catch {
      setPaperStatus({
        label: text.paperFailed,
        detail: text.paperFailedDetail
      });
    } finally {
      setIsPaperSubmitting(false);
    }
  }, [
    previewOrderId,
    text.paperFailed,
    text.paperFailedDetail,
    text.paperLoginRequired,
    text.paperSigning,
    text.paperSigningDetail,
    text.paperSubmitted,
    text.paperSubmittedAs
  ]);

  const handleSideChange = useCallback(
    (side: OrderSide) => {
      setSelectedSide(side);
      router.replace(`${pathname}?side=${side}` as Route, { scroll: false });
    },
    [pathname, router]
  );

  if (status === "loading") {
    return (
      <main className="trading-shell polymarket-shell">
        <WebTopbar />
        <div className="detail-shell">
          <p>{text.loading}</p>
        </div>
      </main>
    );
  }

  if (!selectedMarket || status === "error") {
    return (
      <main className="trading-shell polymarket-shell">
        <WebTopbar />
        <div className="detail-shell">
          <Link className="text-link" href="/">
            {text.back}
          </Link>
          <p>{text.empty}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="trading-shell polymarket-shell">
      <WebTopbar />
      <div className="detail-shell">
        <section className="market-detail-main">
          <Link className="text-link" href="/">
            {text.back}
          </Link>
          <div className="market-detail-hero">
            <div>
              <span className="eyebrow">{text.previewOnly}</span>
              <h1>{selectedMarket.question}</h1>
              <p>{text.subtitle}</p>
            </div>
            <span className="status-pill">{text.apiConnected}</span>
          </div>

          <div className="detail-stats">
            <Metric label={text.statusLabel} value={selectedMarket.source.active && !selectedMarket.source.closed ? text.status : text.previewOnly} />
            <Metric label={text.volume} value={formatUsd(selectedMarket.source.volume)} />
            <Metric label={text.liquidity} value={formatUsd(selectedMarket.source.liquidity)} />
            <Metric label={locale === "zh-CN" ? "最后同步" : "Last sync"} value={formatDateTime(selectedMarket.source.syncedAt, locale)} />
          </div>

          <section className="feed-section">
            <div className="section-heading">
              <h2>{text.orderBook}</h2>
              <span>{text.previewOnly}</span>
            </div>
            <div className="order-book-grid">
              {tradableOutcomes.map((outcome, index) => {
                const side: OrderSide = index === 0 ? "yes" : "no";

                return (
                  <button
                    aria-pressed={selectedSide === side}
                    className={`${side === "yes" ? "order-book-row yes" : "order-book-row no"} ${
                      selectedSide === side ? "active" : ""
                    }`}
                    key={outcome}
                    type="button"
                    onClick={() => handleSideChange(side)}
                  >
                    <span>{outcome}</span>
                    <strong>{formatCents(tradablePrices[index] ?? 0)}</strong>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="market-info-grid">
            <InfoPanel title={text.marketRules} body={text.marketRulesBody} />
            <InfoPanel title={text.wallet} body={text.walletBody} />
            <InfoPanel title={text.route} body={text.routeValue} />
          </section>
        </section>

        <aside className="detail-ticket-pane">
          <OrderTicket
            canSubmitPaper={Boolean(previewOrderId) && !isPaperSubmitting}
            initialSide={initialSide}
            isPaperSubmitting={isPaperSubmitting}
            locale={locale}
            marketTitle={selectedMarket.question}
            onPaperSubmit={handlePaperSubmit}
            onPreviewChange={handlePreviewChange}
            onSideChange={handleSideChange}
            outcomes={tradableOutcomes}
            paperStatus={paperStatus}
            prices={tradablePrices}
            readinessGates={readinessGates}
            selectedSide={selectedSide}
          />
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoPanel({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

function toDisplayMarket(market: MarketListItem, locale: Locale): DisplayMarket {
  return {
    source: market,
    question: localizeMarketQuestion(market.question, locale),
    category: localizeMarketCategory(market.category, locale, locale === "zh-CN" ? "市场" : "Market"),
    outcomes: toStringArray(market.outcomes).map((outcome) => localizeOutcome(outcome, locale)),
    prices: toOutcomePrices(market).map((price) => Number(price)).filter(Number.isFinite)
  };
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

function formatUsd(value: string | null): string {
  if (!value) {
    return "--";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }

  return `$${Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numeric)}`;
}

function formatDateTime(value: string, locale: Locale): string {
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

function formatCents(price: number): string {
  if (!Number.isFinite(price)) {
    return "--";
  }

  return `${Math.round(price * 100)}c`;
}
