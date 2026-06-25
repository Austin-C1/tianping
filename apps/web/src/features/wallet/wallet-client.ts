import { readAccessToken } from "../auth/auth-client";

export interface WalletReadinessGate {
  key: "wallet-binding" | "deposit-wallet" | "funding-allowance" | "region-risk";
  reason: string;
  status: "PENDING" | "READY";
}

export type WalletFundingStatus =
  | "ALLOWANCE_MISSING"
  | "CACHE_STALE"
  | "NO_DEPOSIT_WALLET"
  | "NO_PUSD"
  | "READY";

export interface WalletFundingState {
  allowance: string | null;
  balanceCacheStale: boolean;
  balanceCacheUpdatedAt: string | null;
  minimumOrderSize: string | null;
  minimumOrderSizeMet: boolean | null;
  pUsdBalance: string | null;
  reason: string;
  requiredAllowance: string | null;
  status: WalletFundingStatus;
}

export interface WalletReadiness {
  canPreview: true;
  canSign: boolean;
  depositWallet: {
    address: string | null;
    chainId: number | null;
    status: "CREATED" | "FAILED" | "NOT_CREATED" | "PENDING" | "READY";
  };
  eoa: {
    address: string | null;
    chainId: number | null;
    status: "CONNECTED" | "NOT_CONNECTED";
  };
  funding: WalletFundingState;
  gates: WalletReadinessGate[];
  region: {
    status: "NOT_CHECKED";
  };
}

export interface DepositWalletStatus {
  address: string | null;
  ownerAddress: string | null;
  chainId: number | null;
  status: "FAILED" | "INTENT_CREATED" | "NOT_CREATED" | "PENDING" | "READY";
  updatedAt: string | null;
  latestOperation: {
    id: string;
    type: string;
    status: string;
    failureReason: string | null;
    updatedAt: string;
  } | null;
  latestRelayerTransaction: {
    id: string;
    relayerTransactionId: string | null;
    status: string;
    failureReason: string | null;
    updatedAt: string;
  } | null;
}

export interface CreateDepositWalletIntentInput {
  ownerAddress: string;
  chainId: number;
}

export interface CreateDepositWalletIntentResult {
  action: "CREATE_DEPOSIT_WALLET";
  operationId: string;
  ownerAddress: string;
  chainId: number;
  depositWalletAddress: string | null;
  relayerRequest: Record<string, unknown>;
  status: "INTENT_CREATED" | "SUBMITTED" | "FAILED";
  typedData: {
    action: "CREATE_DEPOSIT_WALLET";
    ownerAddress: string;
    chainId: number;
  };
}

export interface SubmitDepositWalletSignedBatchInput {
  operationId: string;
  signedBatch: Record<string, unknown>;
}

export interface SubmitDepositWalletSignedBatchResult {
  operationId: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  relayerTransactionId: string | null;
  depositWalletAddress: string | null;
  failureReason: string | null;
}

export interface WalletChallenge {
  expiresAt: string;
  message: string;
  nonce: string;
}

export interface VerifyWalletInput {
  address: string;
  chainId: number;
  nonce: string;
  signature: string;
}

export interface VerifyWalletResult {
  address: string;
  chainId: number;
  status: "CONNECTED";
}

export async function getWalletReadiness(): Promise<WalletReadiness | null> {
  const token = readAccessToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/wallets/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to load wallet readiness");
  }

  return (await response.json()) as WalletReadiness;
}

export async function getDepositWalletStatus(): Promise<DepositWalletStatus | null> {
  const token = readAccessToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/wallets/deposit/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to load Deposit Wallet status");
  }

  return (await response.json()) as DepositWalletStatus;
}

export async function refreshBalanceAllowance(): Promise<WalletFundingState> {
  const token = readAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getApiBaseUrl()}/wallets/balance-allowance/refresh`, {
    headers: { Authorization: `Bearer ${token}` },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Failed to refresh balance allowance");
  }

  return (await response.json()) as WalletFundingState;
}

export async function createDepositWalletIntent(
  input: CreateDepositWalletIntentInput
): Promise<CreateDepositWalletIntentResult> {
  const token = readAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getApiBaseUrl()}/wallets/deposit/create-intent`, {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Failed to create Deposit Wallet intent");
  }

  return (await response.json()) as CreateDepositWalletIntentResult;
}

export async function submitDepositWalletSignedBatch(
  input: SubmitDepositWalletSignedBatchInput
): Promise<SubmitDepositWalletSignedBatchResult> {
  const token = readAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getApiBaseUrl()}/wallets/deposit/submit-signed-batch`, {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Failed to submit Deposit Wallet batch");
  }

  return (await response.json()) as SubmitDepositWalletSignedBatchResult;
}

export async function requestWalletChallenge(): Promise<WalletChallenge | null> {
  const token = readAccessToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/wallets/nonce`, {
    headers: { Authorization: `Bearer ${token}` },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Failed to request wallet challenge");
  }

  return (await response.json()) as WalletChallenge;
}

export async function verifyWallet(input: VerifyWalletInput): Promise<VerifyWalletResult> {
  const token = readAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getApiBaseUrl()}/wallets/verify`, {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Wallet verification failed");
  }

  return (await response.json()) as VerifyWalletResult;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}
