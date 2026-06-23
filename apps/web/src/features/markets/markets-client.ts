export interface MarketListItem {
  id: string;
  marketId: string;
  conditionId?: string | null;
  clobTokenIds?: unknown;
  enableOrderBook?: boolean;
  slug: string | null;
  question: string;
  category: string | null;
  active: boolean;
  closed: boolean;
  outcomes: unknown;
  outcomePrices: unknown;
  volume: string | null;
  volume24hr?: string | null;
  liquidity: string | null;
  syncedAt: string;
  quotes?: MarketQuoteItem[];
}

export interface MarketQuoteItem {
  outcome: string;
  outcomeIndex: number;
  tokenId: string;
  bestBid: string | null;
  bestAsk: string | null;
  midpoint: string | null;
  spread: string | null;
  minOrderSize: string | null;
  tickSize: string | null;
  syncedAt: string;
}

export async function fetchMarkets(): Promise<MarketListItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/markets`);

  if (!response.ok) {
    throw new Error("Failed to load markets");
  }

  return (await response.json()) as MarketListItem[];
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}
