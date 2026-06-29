import { previewTradeOrder } from "../features/trading/trading-actions";
import type { PreviewOrderResponse } from "../features/trading/order-preview-client";
import type { MarketListItem } from "../features/markets/markets-client";

export interface PreviewOrderForMarketInput {
  amountUsd: number;
  market: MarketListItem;
  orderType?: "FAK" | "FOK";
  outcomeIndex: number;
}

export async function previewOrderForMarket(
  input: PreviewOrderForMarketInput
): Promise<PreviewOrderResponse> {
  return previewTradeOrder({
    amountUsd: input.amountUsd,
    marketId: input.market.marketId,
    orderType: input.orderType,
    outcomeIndex: input.outcomeIndex
  });
}
