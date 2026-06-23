import Link from "next/link";

const markets = [
  {
    question: "Will BTC close above $100k this week?",
    status: "Data connector next",
    price: "Yes 52c"
  },
  {
    question: "Fed rate cut at next meeting?",
    status: "Watchlist",
    price: "Yes 31c"
  },
  {
    question: "ETH all-time high in 2026?",
    status: "Preview only",
    price: "Yes 44c"
  }
];

const readiness = [
  "注册/登录",
  "钱包连接",
  "Deposit Wallet",
  "入金/授权",
  "签名下单"
];

export default function Home() {
  return (
    <main className="trading-shell">
      <div className="product-topbar">
        <Link className="brand" href="/">
          PMX
        </Link>
        <nav>
          <Link href="/register">注册</Link>
          <Link href="/login">登录</Link>
          <Link href="/account">账户</Link>
        </nav>
      </div>

      <div className="workspace">
        <section className="market-surface">
          <div className="surface-header">
            <div>
              <div className="eyebrow">Non-custodial Polymarket access</div>
              <h1>PMX Trading</h1>
            </div>
            <span className="status-pill">真实下单前必须人工确认</span>
          </div>

          <div className="market-toolbar">
            <label>
              市场搜索
              <input placeholder="Search markets, outcomes, tags" />
            </label>
            <button type="button">同步公开市场</button>
          </div>

          <div className="market-list" aria-label="市场浏览">
            <h2>市场浏览</h2>
            {markets.map((market) => (
              <article className="market-row" key={market.question}>
                <div>
                  <strong>{market.question}</strong>
                  <span>{market.status}</span>
                </div>
                <b>{market.price}</b>
              </article>
            ))}
          </div>
        </section>

        <aside className="trade-rail">
          <section className="rail-panel">
            <h2>交易准备</h2>
            <ol className="readiness-list">
              {readiness.map((item, index) => (
                <li key={item}>
                  <span>{index + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </section>

          <section className="rail-panel order-preview">
            <h2>订单预览</h2>
            <dl>
              <div>
                <dt>路径</dt>
                <dd>用户钱包签名 -&gt; API 校验 -&gt; CLOB</dd>
              </div>
              <div>
                <dt>资金</dt>
                <dd>非托管 Deposit Wallet</dd>
              </div>
              <div>
                <dt>状态</dt>
                <dd>等待市场数据接入</dd>
              </div>
            </dl>
            <button type="button" disabled>
              人工确认 Gate
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
