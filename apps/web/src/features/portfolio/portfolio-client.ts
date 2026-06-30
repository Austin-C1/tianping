import type {
  PortfolioMarket,
  PortfolioPosition,
  PortfolioResponse,
  PortfolioSummary,
  PortfolioTrade
} from "@pmx/api-client";
import { createWebApiClient, readAccessToken } from "../api/api";

export type {
  PortfolioMarket,
  PortfolioPosition,
  PortfolioResponse,
  PortfolioSummary,
  PortfolioTrade
} from "@pmx/api-client";

export const emptyPortfolio: PortfolioResponse = {
  positions: [],
  summary: {
    positionCount: 0,
    tradeCount: 0
  },
  trades: []
};

export async function fetchPortfolio(): Promise<PortfolioResponse> {
  if (!readAccessToken()) {
    return emptyPortfolio;
  }

  return createWebApiClient().portfolio.get();
}
