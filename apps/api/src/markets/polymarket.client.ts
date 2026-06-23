import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PolymarketMarketSource } from "./markets.service";

interface GammaEventSource {
  markets?: PolymarketMarketSource[];
}

@Injectable()
export class PolymarketClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_GAMMA_API_URL", "https://gamma-api.polymarket.com");
  }

  async fetchActiveMarkets(limit = 50): Promise<PolymarketMarketSource[]> {
    const url = new URL("/events", this.baseUrl);
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("order", "volume24hr");
    url.searchParams.set("ascending", "false");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Polymarket Gamma request failed with ${response.status}`);
    }

    const payload = (await response.json()) as GammaEventSource[] | PolymarketMarketSource[];
    return payload.flatMap((item) => ("markets" in item && Array.isArray(item.markets) ? item.markets : [item as PolymarketMarketSource]));
  }
}
