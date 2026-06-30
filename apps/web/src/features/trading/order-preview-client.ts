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

export interface OrderIdInput {
  orderId: string;
}

export interface SigningIntentResponse {
  id: string;
  signingPayload: Record<string, unknown>;
  status: "SIGNING_REQUESTED";
}

export interface SaveSignedOrderInput extends OrderIdInput {
  signedPayload: Record<string, unknown>;
}

export interface SignedOrderResponse {
  id: string;
  signedPayload: Record<string, unknown>;
  status: "SIGNED";
}

export interface OrderListItem {
  clobOrderId?: string | null;
  createdAt?: string;
  failureReason?: string | null;
  id: string;
  market?: {
    marketId: string;
    question: string;
  } | null;
  outcome?: string | null;
  price?: string;
  size?: string;
  status: string;
  submittedAt?: string | null;
  updatedAt?: string;
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

export async function createSigningIntent(input: OrderIdInput): Promise<SigningIntentResponse | null> {
  return postAuthenticated<SigningIntentResponse, OrderIdInput>("/orders/signing-intent", input);
}

export async function saveSignedOrder(
  input: SaveSignedOrderInput
): Promise<SignedOrderResponse | null> {
  return postAuthenticated<SignedOrderResponse, SaveSignedOrderInput>("/orders/signed", input);
}

export async function submitOrder(input: OrderIdInput): Promise<OrderListItem | null> {
  return postAuthenticated<OrderListItem, OrderIdInput>("/orders/submit", input);
}

export async function listOrders(): Promise<OrderListItem[]> {
  const token = readAccessToken();
  if (!token) {
    return [];
  }

  const response = await fetch(`${getApiBaseUrl()}/orders`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Order list request failed");
  }

  return (await response.json()) as OrderListItem[];
}

async function postAuthenticated<TResponse, TBody extends object>(
  path: string,
  body: TBody
): Promise<TResponse | null> {
  const token = readAccessToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("Order request failed");
  }

  return (await response.json()) as TResponse;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}
