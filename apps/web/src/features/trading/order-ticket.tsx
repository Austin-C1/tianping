"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../i18n/messages";
import { calculateOrderPreview, type OrderPreview } from "./order-calculator";

export type OrderSide = "yes" | "no";

interface OrderTicketProps {
  locale: Locale;
  marketTitle: string;
  outcomes: string[];
  prices: number[];
  initialSide?: OrderSide;
  onPreviewChange?: (preview: OrderTicketPreview) => void;
}

export interface OrderTicketPreview extends OrderPreview {
  side: OrderSide;
  outcome: string;
}

const copy = {
  "zh-CN": {
    amount: "金额",
    buy: "买入",
    estimatedCost: "预计成本",
    estimatedPayout: "预计返还",
    estimatedProfit: "预计收益",
    market: "市场",
    notSubmittable: "不可提交",
    orderTicket: "订单票据",
    outcome: "结果",
    price: "价格",
    quantity: "数量",
    risk:
      "真实 CLOB 提交被禁用。钱包、Deposit Wallet、余额和地区限制都通过后才允许进入签名。",
    route: "路径",
    routeValue: "用户钱包签名 -> API 校验 -> CLOB",
    gate: "人工确认 Gate"
  },
  en: {
    amount: "Amount",
    buy: "Buy",
    estimatedCost: "Estimated cost",
    estimatedPayout: "Estimated payout",
    estimatedProfit: "Estimated profit",
    market: "Market",
    notSubmittable: "Not submittable",
    orderTicket: "Order ticket",
    outcome: "Outcome",
    price: "Price",
    quantity: "Quantity",
    risk:
      "Real CLOB submission is disabled. Wallet, Deposit Wallet, balance, and region checks must all pass before signing.",
    route: "Route",
    routeValue: "User wallet signature -> API validation -> CLOB",
    gate: "Manual approval Gate"
  }
} as const;

export function OrderTicket({
  locale,
  marketTitle,
  outcomes,
  prices,
  initialSide = "yes",
  onPreviewChange
}: OrderTicketProps) {
  const text = copy[locale];
  const [side, setSide] = useState<OrderSide>(initialSide);
  const [amountInput, setAmountInput] = useState("10");
  const sideIndex = side === "yes" ? 0 : 1;
  const outcome = outcomes[sideIndex] ?? (side === "yes" ? "Yes" : "No");
  const price = prices[sideIndex] ?? 0;
  const amountUsd = Number(amountInput);
  const preview = useMemo(
    () => calculateOrderPreview({ amountUsd, price }),
    [amountUsd, price]
  );

  useEffect(() => {
    onPreviewChange?.({
      ...preview,
      side,
      outcome
    });
  }, [onPreviewChange, outcome, preview, side]);

  return (
    <section className="ticket-card order-ticket-card">
      <div className="section-heading">
        <h2>{text.orderTicket}</h2>
        <span>{text.notSubmittable}</span>
      </div>

      <div className="ticket-toggle" aria-label={text.outcome}>
        <button
          className={side === "yes" ? "active" : ""}
          type="button"
          onClick={() => setSide("yes")}
        >
          {text.buy} {outcomes[0] ?? "Yes"}
        </button>
        <button
          className={side === "no" ? "active" : ""}
          type="button"
          onClick={() => setSide("no")}
        >
          {text.buy} {outcomes[1] ?? "No"}
        </button>
      </div>

      <div className="ticket-market">
        <span>{text.market}</span>
        <strong>{marketTitle}</strong>
      </div>

      <label className="amount-field">
        <span>{text.amount}</span>
        <input
          inputMode="decimal"
          min="0"
          onChange={(event) => setAmountInput(event.target.value)}
          type="number"
          value={amountInput}
        />
      </label>

      <dl className="ticket-lines">
        <div>
          <dt>{text.outcome}</dt>
          <dd>{outcome}</dd>
        </div>
        <div>
          <dt>{text.price}</dt>
          <dd>{formatCents(price)}</dd>
        </div>
        <div>
          <dt>{text.quantity}</dt>
          <dd>{formatShares(preview.shares, locale)}</dd>
        </div>
        <div>
          <dt>{text.estimatedCost}</dt>
          <dd>{formatUsd(preview.amountUsd)}</dd>
        </div>
        <div>
          <dt>{text.estimatedPayout}</dt>
          <dd>{formatUsd(preview.estimatedPayout)}</dd>
        </div>
        <div>
          <dt>{text.estimatedProfit}</dt>
          <dd>{formatUsd(preview.estimatedProfit)}</dd>
        </div>
        <div>
          <dt>{text.route}</dt>
          <dd>{text.routeValue}</dd>
        </div>
      </dl>

      <div className="risk-note">{text.risk}</div>
      <button className="gate-button" type="button" disabled>
        {text.gate}
      </button>
    </section>
  );
}

function formatCents(price: number): string {
  if (!Number.isFinite(price)) {
    return "--";
  }

  return `${Math.round(price * 100)}c`;
}

function formatShares(value: number, locale: Locale): string {
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return locale === "zh-CN" ? `${formatted} 份` : `${formatted} shares`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}
