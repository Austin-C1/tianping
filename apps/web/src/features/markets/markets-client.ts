export interface MarketListItem {
  id: string;
  marketId: string;
  slug: string | null;
  question: string;
  category: string | null;
  active: boolean;
  closed: boolean;
  outcomes: unknown;
  outcomePrices: unknown;
  volume: string | null;
  liquidity: string | null;
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
