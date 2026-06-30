import { refreshBalanceAllowance as refreshBalanceAllowanceRequest } from "./wallet-client";
import type { WalletFundingState } from "./wallet-client";

export type { WalletFundingState } from "./wallet-client";

export async function refreshBalanceAllowance(): Promise<WalletFundingState> {
  return refreshBalanceAllowanceRequest();
}

export async function refreshFundingReadiness(): Promise<WalletFundingState> {
  return refreshBalanceAllowance();
}
