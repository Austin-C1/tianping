import { readAccessToken } from "../auth/auth-client";

export interface PortfolioMarket {
  marketId: string;
  question: string;
}

export interface PortfolioPosition {
  averagePrice: string;
  id: string;
  market: PortfolioMarket | null;
  outcome: string;
  size: string;
  updatedAt: string;
}

export interface PortfolioTrade {
  clobTradeId: string | null;
  executedAt: string;
  id: string;
  market: PortfolioMarket | null;
  orderId: string | null;
  price: string;
  side: "BUY" | "SELL";
  size: string;
}

export interface PortfolioSummary {
  positionCount: number;
  tradeCount: number;
}

export interface PortfolioResponse {
  positions: PortfolioPosition[];
  summary: PortfolioSummary;
  trades: PortfolioTrade[];
}

export const emptyPortfolio: PortfolioResponse = {
  positions: [],
  summary: {
    positionCount: 0,
    tradeCount: 0
  },
  trades: []
};

export async function fetchPortfolio(): Promise<PortfolioResponse> {
  const token = readAccessToken();
  if (!token) {
    return emptyPortfolio;
  }

  const response = await fetch(`${getApiBaseUrl()}/portfolio`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Portfolio request failed");
  }

  return (await response.json()) as PortfolioResponse;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}
