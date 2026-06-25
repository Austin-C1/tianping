"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "../i18n/language-provider";
import {
  createDepositWalletIntent,
  getDepositWalletStatus,
  getWalletReadiness,
  requestWalletChallenge,
  refreshBalanceAllowance,
  submitDepositWalletSignedBatch,
  verifyWallet,
  type CreateDepositWalletIntentResult,
  type DepositWalletStatus,
  type WalletReadiness
} from "./wallet-client";

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    };
  }
}

type WalletPanelState =
  | { status: "loading" }
  | { depositStatus: DepositWalletStatus | null; readiness: WalletReadiness | null; status: "ready" }
  | { status: "error" };

type DepositWalletIntentState = CreateDepositWalletIntentResult | null;

const walletCopy = {
  "zh-CN": {
    action: "Action",
    createDepositWallet: "Create Deposit Wallet",
    depositWalletActionFailed: "Deposit Wallet action failed",
    failure: "Failure",
    fundingInstructions:
      "请通过 Polymarket Deposit Wallet 入金或出金。本阶段 PMX 不通过 Platform Wallet 路由资金。",
    signAndSubmitDepositWallet: "Sign and submit Deposit Wallet batch",
    signedBatchSubmitted: "Deposit Wallet batch submitted",
    chain: "Chain",
    connect: "连接钱包",
    connected: "已连接",
    deposit: "Deposit Wallet",
    failed: "钱包状态读取失败",
    funding: "资金与授权",
    loading: "正在读取钱包状态",
    noProvider: "未检测到钱包插件",
    notAuthenticated: "请先登录",
    notChecked: "待检查",
    notConnected: "未连接",
    notCreated: "未创建",
    owner: "Owner",
    providerFailed: "钱包签名失败",
    pUsd: "pUSD",
    relayer: "Relayer",
    refreshBalance: "Refresh balance",
    required: "Required",
    risk: "风控状态",
    updated: "Updated",
    wallet: "钱包状态"
  },
  en: {
    action: "Action",
    createDepositWallet: "Create Deposit Wallet",
    depositWalletActionFailed: "Deposit Wallet action failed",
    failure: "Failure",
    fundingInstructions:
      "Fund or withdraw through your Polymarket Deposit Wallet. PMX does not route funds through a Platform Wallet in this phase.",
    signAndSubmitDepositWallet: "Sign and submit Deposit Wallet batch",
    signedBatchSubmitted: "Deposit Wallet batch submitted",
    chain: "Chain",
    connect: "Connect wallet",
    connected: "Connected",
    deposit: "Deposit Wallet",
    failed: "Wallet readiness failed",
    funding: "Funding and approvals",
    loading: "Loading wallet readiness",
    noProvider: "Wallet provider not found",
    notAuthenticated: "Please sign in first",
    notChecked: "Not checked",
    notConnected: "Not connected",
    notCreated: "Not created",
    owner: "Owner",
    providerFailed: "Wallet signature failed",
    pUsd: "pUSD",
    relayer: "Relayer",
    refreshBalance: "Refresh balance",
    required: "Required",
    risk: "Risk status",
    updated: "Updated",
    wallet: "Wallet status"
  }
} as const;

export function WalletPanel() {
  const { locale } = useLanguage();
  const copy = walletCopy[locale];
  const [state, setState] = useState<WalletPanelState>({ status: "loading" });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [depositIntent, setDepositIntent] = useState<DepositWalletIntentState>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreatingDepositWallet, setIsCreatingDepositWallet] = useState(false);
  const [isRefreshingFunding, setIsRefreshingFunding] = useState(false);

  const loadReadiness = async () => {
    try {
      const [readiness, depositStatus] = await Promise.all([
        getWalletReadiness(),
        getDepositWalletStatus()
      ]);
      setState({ depositStatus, readiness, status: "ready" });
    } catch {
      setState({ status: "error" });
    }
  };

  useEffect(() => {
    let active = true;

    Promise.all([getWalletReadiness(), getDepositWalletStatus()])
      .then(([readiness, depositStatus]) => {
        if (active) {
          setState({ depositStatus, readiness, status: "ready" });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "error" });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleConnect = async () => {
    setActionMessage(null);

    if (!window.ethereum) {
      setActionMessage(copy.noProvider);
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
      if (!address) {
        throw new Error("No wallet account returned");
      }

      const chainIdValue = await window.ethereum.request({ method: "eth_chainId" });
      const chainId =
        typeof chainIdValue === "string"
          ? Number.parseInt(chainIdValue, 16)
          : Number(chainIdValue);
      const challenge = await requestWalletChallenge();
      if (!challenge || !Number.isFinite(chainId)) {
        throw new Error("Wallet challenge failed");
      }

      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challenge.message, address]
      });
      if (typeof signature !== "string") {
        throw new Error("Wallet signature failed");
      }

      await verifyWallet({
        address,
        chainId,
        nonce: challenge.nonce,
        signature
      });
      await loadReadiness();
    } catch {
      setActionMessage(copy.providerFailed);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateDepositWallet = async () => {
    setActionMessage(null);

    if (state.status !== "ready" || !state.readiness?.eoa.address || !state.readiness.eoa.chainId) {
      setActionMessage(copy.notConnected);
      return;
    }

    setIsCreatingDepositWallet(true);
    try {
      const intent = await createDepositWalletIntent({
        chainId: state.readiness.eoa.chainId,
        ownerAddress: state.readiness.eoa.address
      });
      setDepositIntent(intent);
    } catch {
      setActionMessage(copy.depositWalletActionFailed);
    } finally {
      setIsCreatingDepositWallet(false);
    }
  };

  const handleSignAndSubmitDepositWallet = async () => {
    setActionMessage(null);

    if (!depositIntent) {
      return;
    }

    if (!window.ethereum) {
      setActionMessage(copy.noProvider);
      return;
    }

    setIsCreatingDepositWallet(true);
    try {
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [formatDepositWalletAction(depositIntent), depositIntent.ownerAddress]
      });
      if (typeof signature !== "string") {
        throw new Error("Wallet signature failed");
      }

      await submitDepositWalletSignedBatch({
        operationId: depositIntent.operationId,
        signedBatch: {
          ownerSignature: signature,
          relayerRequest: depositIntent.relayerRequest
        }
      });
      setDepositIntent(null);
      setActionMessage(copy.signedBatchSubmitted);
      await loadReadiness();
    } catch {
      setActionMessage(copy.providerFailed);
    } finally {
      setIsCreatingDepositWallet(false);
    }
  };

  const handleRefreshFunding = async () => {
    setActionMessage(null);
    setIsRefreshingFunding(true);

    try {
      await refreshBalanceAllowance();
      await loadReadiness();
    } catch {
      setActionMessage(copy.depositWalletActionFailed);
    } finally {
      setIsRefreshingFunding(false);
    }
  };

  if (state.status === "loading") {
    return <p>{copy.loading}</p>;
  }

  if (state.status === "error") {
    return <p>{copy.failed}</p>;
  }

  if (!state.readiness) {
    return <p>{copy.notAuthenticated}</p>;
  }

  const readiness = state.readiness;
  const depositStatus = state.depositStatus;
  const walletGate = readiness.gates.find((gate) => gate.key === "wallet-binding");
  const depositGate = readiness.gates.find((gate) => gate.key === "deposit-wallet");
  const fundingGate = readiness.gates.find((gate) => gate.key === "funding-allowance");
  const regionGate = readiness.gates.find((gate) => gate.key === "region-risk");
  const funding = readiness.funding;
  const depositAddress = depositStatus?.address ?? readiness.depositWallet.address;
  const relayerFailureReason =
    depositStatus?.latestRelayerTransaction?.failureReason ??
    depositStatus?.latestOperation?.failureReason ??
    null;
  const canCreateDepositWallet =
    readiness.eoa.status === "CONNECTED" &&
    Boolean(readiness.eoa.address) &&
    Boolean(readiness.eoa.chainId) &&
    (depositStatus?.status ?? readiness.depositWallet.status) !== "READY";

  return (
    <section className="wallet-panel">
      <div className="account-grid">
        <WalletStatusCard
          body={readiness.eoa.address ?? walletGate?.reason ?? copy.notConnected}
          status={readiness.eoa.status === "CONNECTED" ? copy.connected : copy.notConnected}
          title={copy.wallet}
        >
          {readiness.eoa.chainId ? <small>{copy.chain} {readiness.eoa.chainId}</small> : null}
        </WalletStatusCard>
        <WalletStatusCard
          body={depositAddress ?? depositGate?.reason ?? copy.notCreated}
          status={depositStatusLabel(depositStatus?.status ?? readiness.depositWallet.status, copy)}
          title={copy.deposit}
        >
          {readiness.depositWallet.chainId ? <small>{copy.chain} {readiness.depositWallet.chainId}</small> : null}
          {depositStatus?.ownerAddress ? <small>{copy.owner} {depositStatus.ownerAddress}</small> : null}
          {depositStatus?.latestRelayerTransaction ? (
            <small>{copy.relayer} {depositStatus.latestRelayerTransaction.status}</small>
          ) : null}
          {relayerFailureReason ? <small>{copy.failure} {relayerFailureReason}</small> : null}
          {depositStatus?.updatedAt ? <small>{copy.updated} {formatDate(depositStatus.updatedAt, locale)}</small> : null}
        </WalletStatusCard>
        <WalletStatusCard
          body={fundingGate?.reason ?? funding.reason ?? copy.notChecked}
          status={funding.status}
          title={copy.funding}
        >
          {funding.pUsdBalance ? <small>{copy.pUsd} {funding.pUsdBalance}</small> : null}
          {funding.allowance ? <small>Allowance {funding.allowance}</small> : null}
          {funding.requiredAllowance ? (
            <small>{copy.required} {funding.requiredAllowance}</small>
          ) : null}
          {funding.balanceCacheUpdatedAt ? (
            <small>{copy.updated} {formatDate(funding.balanceCacheUpdatedAt, locale)}</small>
          ) : null}
          <small>{copy.fundingInstructions}</small>
          <button disabled={isRefreshingFunding} type="button" onClick={handleRefreshFunding}>
            {copy.refreshBalance}
          </button>
        </WalletStatusCard>
        <WalletStatusCard
          body={regionGate?.reason ?? copy.notChecked}
          status={copy.notChecked}
          title={copy.risk}
        />
      </div>
      <button disabled={isConnecting} type="button" onClick={handleConnect}>
        {copy.connect}
      </button>
      {canCreateDepositWallet ? (
        <button disabled={isCreatingDepositWallet} type="button" onClick={handleCreateDepositWallet}>
          {copy.createDepositWallet}
        </button>
      ) : null}
      {depositIntent ? (
        <section className="account-status-card">
          <div>
            <h2>{copy.deposit}</h2>
            <span>{copy.notChecked}</span>
          </div>
          <small>{copy.action} {depositIntent.action}</small>
          <small>{copy.owner} {depositIntent.ownerAddress}</small>
          <small>{copy.chain} {depositIntent.chainId}</small>
          {depositIntent.depositWalletAddress ? (
            <small>{copy.deposit} {depositIntent.depositWalletAddress}</small>
          ) : null}
          <button
            disabled={isCreatingDepositWallet}
            type="button"
            onClick={handleSignAndSubmitDepositWallet}
          >
            {copy.signAndSubmitDepositWallet}
          </button>
        </section>
      ) : null}
      {actionMessage ? <p role="status">{actionMessage}</p> : null}
    </section>
  );
}

function formatDepositWalletAction(intent: CreateDepositWalletIntentResult): string {
  return [
    "PMX Deposit Wallet action",
    `Action: ${intent.action}`,
    `Owner: ${intent.ownerAddress}`,
    `Chain: ${intent.chainId}`,
    `Deposit Wallet: ${intent.depositWalletAddress ?? "pending"}`
  ].join("\n");
}

function depositStatusLabel(
  status: DepositWalletStatus["status"] | WalletReadiness["depositWallet"]["status"],
  copy: (typeof walletCopy)[keyof typeof walletCopy]
) {
  if (status === "READY" || status === "CREATED") {
    return copy.connected;
  }

  if (status === "PENDING" || status === "INTENT_CREATED") {
    return copy.notChecked;
  }

  return copy.notCreated;
}

function formatDate(value: string, locale: "zh-CN" | "en") {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    timeZone: "UTC"
  });
}

function WalletStatusCard({
  body,
  children,
  status,
  title
}: {
  body: string;
  children?: ReactNode;
  status: string;
  title: string;
}) {
  return (
    <section className="account-status-card">
      <div>
        <h2>{title}</h2>
        <span>{status}</span>
      </div>
      <p>{body}</p>
      {children}
    </section>
  );
}
