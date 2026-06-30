"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../i18n/messages";
import { calculateOrderPreview, parseOrderAmount, type OrderPreview } from "./order-calculator";

export type OrderSide = "yes" | "no";

interface OrderTicketBaseProps {
  canSubmitPaper?: boolean;
  isPaperSubmitting?: boolean;
  locale: Locale;
  marketTitle: string;
  outcomes: string[];
  prices: number[];
  onPaperSubmit?: () => void;
  onPreviewChange?: (preview: OrderTicketPreview) => void;
  paperStatus?: {
    detail?: string;
    label: string;
  };
  readinessGates?: OrderReadinessGate[];
}

type OrderTicketProps =
  | (OrderTicketBaseProps & {
      initialSide?: OrderSide;
      onSideChange?: never;
      selectedSide?: never;
    })
  | (OrderTicketBaseProps & {
      initialSide?: OrderSide;
      onSideChange: (side: OrderSide) => void;
      selectedSide: OrderSide;
    });

export interface OrderTicketPreview extends OrderPreview {
  side: OrderSide;
  outcome: string;
}

export interface OrderReadinessGate {
  key: string;
  reason: string;
  status: "BLOCKED" | "PENDING" | "READY";
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
    paperSubmit: "提交 paper 订单",
    paperTitle: "Paper 订单",
    price: "价格",
    quantity: "数量",
    risk:
      "真实 CLOB 提交被禁用。钱包、Deposit Wallet、余额和地区限制都通过后才允许进入签名。",
    route: "路径",
    routeValue: "用户钱包签名 → API 校验 → CLOB",
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
    paperSubmit: "Submit paper order",
    paperTitle: "Paper order",
    price: "Price",
    quantity: "Quantity",
    risk:
      "Real CLOB submission is disabled. Wallet, Deposit Wallet, balance, and region checks must all pass before signing.",
    route: "Route",
    routeValue: "User wallet signature → API validation → CLOB",
    gate: "Manual approval Gate"
  }
} as const;

const quickAmounts = [1, 5, 10, 25, 50] as const;

export function OrderTicket({
  canSubmitPaper = false,
  isPaperSubmitting = false,
  locale,
  marketTitle,
  onPaperSubmit,
  outcomes,
  prices,
  paperStatus,
  initialSide = "yes",
  selectedSide,
  onSideChange,
  onPreviewChange,
  readinessGates = []
}: OrderTicketProps) {
  const text = copy[locale];
  const [internalSide, setInternalSide] = useState<OrderSide>(initialSide);
  const side = selectedSide ?? internalSide;
  const [amountInput, setAmountInput] = useState("10");
  const sideIndex = side === "yes" ? 0 : 1;
  const outcome = outcomes[sideIndex] ?? (side === "yes" ? "Yes" : "No");
  const price = prices[sideIndex] ?? 0;
  const amountUsd = parseOrderAmount(amountInput);
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

  useEffect(() => {
    setInternalSide(initialSide);
  }, [initialSide]);

  const handleSideChange = (nextSide: OrderSide) => {
    if (selectedSide === undefined) {
      setInternalSide(nextSide);
    }

    onSideChange?.(nextSide);
  };

  return (
    <section className="ticket-card order-ticket-card">
      <div className="section-heading">
        <h2>{text.orderTicket}</h2>
        <span>{text.notSubmittable}</span>
      </div>

      <div className="ticket-toggle" aria-label={text.outcome}>
        <button
          aria-pressed={side === "yes"}
          className={side === "yes" ? "active" : ""}
          type="button"
          onClick={() => handleSideChange("yes")}
        >
          {text.buy} {outcomes[0] ?? "Yes"}
        </button>
        <button
          aria-pressed={side === "no"}
          className={side === "no" ? "active" : ""}
          type="button"
          onClick={() => handleSideChange("no")}
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
          onChange={(event) => setAmountInput(event.target.value)}
          type="text"
          value={amountInput}
        />
      </label>

      <div className="amount-shortcuts" aria-label="Quick presets">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => setAmountInput(String(amount))}
          >
            ${amount}
          </button>
        ))}
      </div>

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
      {readinessGates.length > 0 ? (
        <section className="readiness-card">
          <div className="section-heading">
            <h2>{readinessLabel(locale)}</h2>
            <span>{text.notSubmittable}</span>
          </div>
          <ul className="readiness-list">
            {readinessGates.map((gate) => (
              <li className={gate.status.toLowerCase()} key={gate.key}>
                <span>{gate.status === "READY" ? "OK" : "!"}</span>
                <div>
                  <strong>{formatGateKey(gate.key)}</strong>
                  <small>{gate.reason}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {onPaperSubmit ? (
        <section className="readiness-card">
          <div className="section-heading">
            <h2>{text.paperTitle}</h2>
            <span>{paperStatus?.label ?? text.notSubmittable}</span>
          </div>
          {paperStatus?.detail ? <p>{paperStatus.detail}</p> : null}
          <button
            className="gate-button"
            disabled={!canSubmitPaper || isPaperSubmitting}
            type="button"
            onClick={onPaperSubmit}
          >
            {text.paperSubmit}
          </button>
        </section>
      ) : null}
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

function readinessLabel(locale: Locale): string {
  return locale === "zh-CN" ? "交易检查" : "Readiness gates";
}

function formatGateKey(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
