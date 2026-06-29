import { Injectable } from "@nestjs/common";
import { PolymarketClient } from "../../../markets/polymarket.client";
import type {
  MarketProvider,
  ProviderMarketSource,
  ProviderOrderBookSource
} from "../provider.types";

@Injectable()
export class PolymarketMarketProvider implements MarketProvider {
  readonly providerId = "polymarket";

  constructor(private readonly client: PolymarketClient) {}

  async listActiveMarkets(): Promise<ProviderMarketSource[]> {
    return this.client.fetchActiveMarkets();
  }

  async getOrderBooks(tokenIds: string[]): Promise<ProviderOrderBookSource[]> {
    return this.client.fetchOrderBooks(tokenIds);
  }
}
