import type { MarketListItem } from "@pmx/api-client";
import { createWebApiClient } from "../api/api";

export type { MarketListItem } from "@pmx/api-client";
export type MarketQuoteItem = NonNullable<MarketListItem["quotes"]>[number];

export async function fetchMarkets(): Promise<MarketListItem[]> {
  return createWebApiClient().markets.list();
}
