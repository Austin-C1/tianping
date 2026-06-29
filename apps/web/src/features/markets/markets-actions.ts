import { fetchMarkets, type MarketListItem } from "./markets-client";

export type { MarketListItem, MarketQuoteItem } from "./markets-client";

export interface PickTradableMarketInput {
  category?: string;
  marketId?: string;
}

export async function listMarkets(): Promise<MarketListItem[]> {
  return fetchMarkets();
}

export async function pickTradableMarket(input: PickTradableMarketInput = {}): Promise<MarketListItem> {
  const markets = await listMarkets();
  const market = markets.find((item) => isTradableMarket(item) && matchesMarket(item, input));

  if (!market) {
    throw new Error("No tradable market available");
  }

  return market;
}

function matchesMarket(market: MarketListItem, input: PickTradableMarketInput): boolean {
  if (input.marketId && market.marketId !== input.marketId && market.id !== input.marketId) {
    return false;
  }

  if (input.category && market.category !== input.category) {
    return false;
  }

  return true;
}

function isTradableMarket(market: MarketListItem): boolean {
  return market.active && !market.closed && toArray(market.outcomes).length >= 2 && toArray(market.outcomePrices).length >= 2;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
