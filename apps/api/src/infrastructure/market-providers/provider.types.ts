export const MARKET_PROVIDER = Symbol("MARKET_PROVIDER");

export interface ProviderMarketSource {
  active?: boolean;
  category?: string | null;
  clobTokenIds?: unknown;
  closed?: boolean;
  conditionId?: string;
  enableOrderBook?: boolean;
  id?: string | number;
  liquidity?: string | number | null;
  outcomePrices?: unknown;
  outcomes?: unknown;
  question?: string | null;
  slug?: string | null;
  volume?: string | number | null;
  volume24hr?: string | number | null;
}

export interface ProviderOrderBookSource {
  asks?: Array<{ price: string; size: string }>;
  asset_id: string;
  bids?: Array<{ price: string; size: string }>;
  hash?: string;
  last_trade_price?: string;
  market?: string;
  min_order_size?: string;
  neg_risk?: boolean;
  tick_size?: string;
}

export interface MarketProvider {
  providerId: string;
  getOrderBooks(tokenIds: string[]): Promise<ProviderOrderBookSource[]>;
  listActiveMarkets(): Promise<ProviderMarketSource[]>;
}
