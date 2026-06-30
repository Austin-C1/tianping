import { getWalletReadiness as getWalletReadinessRequest } from "./wallet-client";
import type { WalletReadiness } from "./wallet-client";

export type { WalletReadiness, WalletReadinessGate } from "./wallet-client";

export async function getWalletReadiness(): Promise<WalletReadiness | null> {
  return getWalletReadinessRequest();
}

export async function loadWalletReadiness(): Promise<WalletReadiness | null> {
  return getWalletReadiness();
}
