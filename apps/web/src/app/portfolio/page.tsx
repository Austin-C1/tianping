"use client";

import { useLanguage } from "../../features/i18n/language-provider";
import { WebTopbar } from "../../features/layout/web-topbar";

const copy = {
  "zh-CN": {
    available: "$0.00",
    balance: "可用余额",
    deposit: "Deposit Wallet",
    depositStatus: "未创建",
    eyebrow: "账户资产",
    positions: "持仓",
    positionsEmpty: "暂无持仓。真实成交同步会在 CLOB 链路完成后开放。",
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
    positions: "Positions",
    positionsEmpty: "No positions yet. Real fill sync opens after the CLOB flow is complete.",
    title: "Portfolio",
    unrealized: "Unrealized P/L",
    wallet: "Wallet",
    walletStatus: "Not connected"
  }
} as const;

export default function PortfolioPage() {
  const { locale } = useLanguage();
  const text = copy[locale];

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
          <p>{text.positionsEmpty}</p>
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
