import {
  bindWalletWithSigner,
  ensureDepositWallet,
  loadDepositWalletStatus,
  loadWalletReadiness,
  type BindWalletWithSignerInput,
  type EnsureDepositWalletInput
} from "../features/wallet/wallet-actions";

export async function getWalletReadinessState() {
  return loadWalletReadiness();
}

export async function getDepositWalletState() {
  return loadDepositWalletStatus();
}

export async function bindWallet(input: BindWalletWithSignerInput) {
  return bindWalletWithSigner(input);
}

export async function prepareDepositWallet(input: EnsureDepositWalletInput) {
  return ensureDepositWallet(input);
}
