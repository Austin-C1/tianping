import { Module } from "@nestjs/common";
import { PolymarketClient } from "../../markets/polymarket.client";
import { PolymarketMarketProvider } from "./polymarket/polymarket.provider";
import { MARKET_PROVIDER } from "./provider.types";

@Module({
  providers: [
    PolymarketClient,
    PolymarketMarketProvider,
    {
      provide: MARKET_PROVIDER,
      useExisting: PolymarketMarketProvider
    }
  ],
  exports: [MARKET_PROVIDER]
})
export class MarketProviderModule {}
