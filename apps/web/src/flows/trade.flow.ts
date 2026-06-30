import {
  createTradeSigningIntent,
  previewTradeOrder,
  saveTradeSignedOrder,
  submitTradeOrder
} from "../features/trading/trading-actions";
import type {
  ManagedOrder,
  OrderIdInput,
  PreviewOrderResponse,
  SaveSignedOrderInput,
  SignedOrderResponse,
  SigningIntentResponse
} from "../features/trading/trading-actions";
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

export function createPaperSigningIntent(input: OrderIdInput): Promise<SigningIntentResponse> {
  return createTradeSigningIntent(input);
}

export function savePaperSignedOrder(input: SaveSignedOrderInput): Promise<SignedOrderResponse> {
  return saveTradeSignedOrder(input);
}

export function submitPaperOrder(input: OrderIdInput): Promise<ManagedOrder> {
  return submitTradeOrder(input);
}
