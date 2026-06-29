import { pickTradableMarket } from "../market.flow";
import { previewOrderForMarket } from "../trade.flow";
import type { PickTradableMarketInput } from "../../features/markets/markets-actions";
import type { MarketListItem } from "../../features/markets/markets-client";
import type { PreviewOrderResponse } from "../../features/trading/order-preview-client";

export interface RunTradePreviewScenarioInput {
  amountUsd: number;
  market?: PickTradableMarketInput;
  orderType?: "FAK" | "FOK";
  outcomeIndex: number;
}

export interface RunTradePreviewScenarioResult {
  market: MarketListItem;
  preview: PreviewOrderResponse;
}

export async function runTradePreviewScenario(
  input: RunTradePreviewScenarioInput
): Promise<RunTradePreviewScenarioResult> {
  const market = await pickTradableMarket(input.market);
  const preview = await previewOrderForMarket({
    amountUsd: input.amountUsd,
    market,
    orderType: input.orderType,
    outcomeIndex: input.outcomeIndex
  });

  return { market, preview };
}
