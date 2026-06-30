import {
  emptyPortfolio,
  fetchPortfolio,
  type PortfolioPosition,
  type PortfolioResponse,
  type PortfolioTrade
} from "./portfolio-client";

export { emptyPortfolio };
export type { PortfolioPosition, PortfolioResponse, PortfolioTrade };

export function loadPortfolio(): Promise<PortfolioResponse> {
  return fetchPortfolio();
}
