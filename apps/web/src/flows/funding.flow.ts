import { refreshFundingReadiness } from "../features/wallet/wallet-actions";

export async function refreshFundingState() {
  return refreshFundingReadiness();
}
