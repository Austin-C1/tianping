"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/language-provider";
import { clearAccessToken, getCurrentUser, readAccessToken, type AuthUser } from "./auth-client";

type AccountState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "error" };

export function AccountPanel() {
  const { locale, messages } = useLanguage();
  const copy = messages.auth;
  const panelCopy = accountPanelCopy[locale];
  const [state, setState] = useState<AccountState>({ status: "loading" });

  useEffect(() => {
    if (!readAccessToken()) {
      setState({ status: "anonymous" });
      return;
    }

    getCurrentUser()
      .then((user) => setState({ status: "authenticated", user }))
      .catch(() => setState({ status: "error" }));
  }, []);

  if (state.status === "loading") {
    return <p>{copy.loadingAccount}</p>;
  }

  if (state.status === "anonymous") {
    return <p>{copy.signInFirst}</p>;
  }

  if (state.status === "error") {
    return <p>{copy.readAccountFailed}</p>;
  }

  return (
    <section className="panel account-panel">
      <div className="account-summary">
        <div>
          <h2>{copy.accountPanelTitle}</h2>
          <p>{state.user.email}</p>
        </div>
        <span>{state.user.role ?? "USER"}</span>
      </div>

      <div className="account-grid">
        <AccountStatusCard
          title={panelCopy.walletTitle}
          status={panelCopy.notConnected}
          body={panelCopy.walletBody}
        />
        <AccountStatusCard
          title="Deposit Wallet"
          status={panelCopy.notCreated}
          body={panelCopy.depositBody}
        />
        <AccountStatusCard
          title={panelCopy.fundingTitle}
          status={panelCopy.pending}
          body={panelCopy.fundingBody}
        />
        <AccountStatusCard
          title={panelCopy.riskTitle}
          status={panelCopy.previewOnly}
          body={panelCopy.riskBody}
        />
      </div>

      <section className="account-ledger">
        <h2>{panelCopy.orderPreviewTitle}</h2>
        <div>
          <span>{panelCopy.market}</span>
          <strong>{panelCopy.noOrder}</strong>
        </div>
        <div>
          <span>{panelCopy.route}</span>
          <strong>{panelCopy.routeValue}</strong>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          clearAccessToken();
          setState({ status: "anonymous" });
        }}
      >
        {copy.signOut}
      </button>
    </section>
  );
}

function AccountStatusCard({ title, status, body }: { title: string; status: string; body: string }) {
  return (
    <section className="account-status-card">
      <div>
        <h2>{title}</h2>
        <span>{status}</span>
      </div>
      <p>{body}</p>
    </section>
  );
}

const accountPanelCopy = {
  "zh-CN": {
    depositBody: "还没有创建非托管 Deposit Wallet，不能进入签名下单。",
    fundingBody: "余额、USDC 授权和地区限制都还未通过检查。",
    fundingTitle: "资金与授权",
    market: "市场",
    noOrder: "暂无订单预览记录",
    notConnected: "未连接",
    notCreated: "未创建",
    orderPreviewTitle: "订单预览记录",
    pending: "待检查",
    previewOnly: "仅预览",
    riskBody: "真实交易 Gate 关闭，所有关键动作后续都会写入审计日志。",
    riskTitle: "风控状态",
    route: "路径",
    routeValue: "用户钱包签名 -> API 校验 -> CLOB",
    walletBody: "当前账号还没有绑定 EVM 钱包，下一阶段接入签名证明。",
    walletTitle: "钱包状态"
  },
  en: {
    depositBody: "No non-custodial Deposit Wallet has been created, so order signing is blocked.",
    fundingBody: "Balance, USDC approval, and region checks have not passed yet.",
    fundingTitle: "Funding and approvals",
    market: "Market",
    noOrder: "No order previews yet",
    notConnected: "Not connected",
    notCreated: "Not created",
    orderPreviewTitle: "Order preview history",
    pending: "Pending",
    previewOnly: "Preview only",
    riskBody: "The real trading Gate is closed. Later critical actions will be written to audit logs.",
    riskTitle: "Risk status",
    route: "Route",
    routeValue: "User wallet signature -> API validation -> CLOB",
    walletBody: "This account has not bound an EVM wallet. Signature proof comes in the next phase.",
    walletTitle: "Wallet status"
  }
} as const;
