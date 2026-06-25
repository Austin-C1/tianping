import { readAccessToken } from "../auth/auth-client";
import type { WalletFundingState } from "../wallet/wallet-client";

export interface PreviewOrderInput {
  amountUsd: number;
  marketId: string;
  outcomeIndex: number;
  orderType?: "FAK" | "FOK";
}

export interface PreviewOrderResponse {
  id: string;
  builderAttributionStatus?: "CONFIGURED" | "MISSING";
  clob?: {
    amount?: number;
    builderCode?: string | null;
    negRisk?: boolean;
    orderType?: "FAK" | "FOK";
    side?: "BUY" | "SELL";
    signatureType?: string;
    tickSize?: string;
    tokenID?: string;
  };
  readiness?: {
    canPreview: boolean;
    canSign: boolean;
    funding?: WalletFundingState;
    gates: Array<{
      key: string;
      reason: string;
      status: "BLOCKED" | "PENDING" | "READY";
    }>;
  };
  submitDisabled: boolean;
}

export async function previewOrder(input: PreviewOrderInput): Promise<PreviewOrderResponse | null> {
  const token = readAccessToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/orders/preview`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Order preview request failed");
  }

  return (await response.json()) as PreviewOrderResponse;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}
