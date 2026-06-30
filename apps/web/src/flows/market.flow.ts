import {
  pickTradableMarket as pickTradableMarketAction,
  type PickTradableMarketInput
} from "../features/markets/markets-actions";
import type { MarketListItem } from "../features/markets/markets-client";

export async function pickTradableMarket(input: PickTradableMarketInput = {}): Promise<MarketListItem> {
  return pickTradableMarketAction(input);
}
