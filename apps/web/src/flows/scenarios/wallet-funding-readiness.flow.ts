import { refreshFundingState } from "../funding.flow";
import {
  bindWallet,
  getDepositWalletState,
  getWalletReadinessState,
  prepareDepositWallet
} from "../wallet.flow";
import type { DepositWalletSignerAdapter } from "../../features/wallet/wallet-actions";
import type {
  DepositWalletStatus,
  SubmitDepositWalletSignedBatchResult,
  VerifyWalletResult,
  WalletFundingState,
  WalletReadiness,
  WalletReadinessGate
} from "../../features/wallet/wallet-client";

export interface WalletFundingBlockedScenarioResult {
  blockingGates: WalletReadinessGate[];
  depositWallet: DepositWalletStatus | null;
  readiness: WalletReadiness | null;
}

export interface WalletFundingReadyScenarioInput {
  signer: DepositWalletSignerAdapter;
}

export interface WalletFundingReadyScenarioResult {
  depositWallet: DepositWalletStatus | SubmitDepositWalletSignedBatchResult;
  funding: WalletFundingState;
  wallet: VerifyWalletResult;
}

export async function runWalletFundingBlockedScenario(): Promise<WalletFundingBlockedScenarioResult> {
  const readiness = await getWalletReadinessState();
  const depositWallet = await getDepositWalletState();

  return {
    blockingGates: readiness?.gates.filter((gate) => gate.status !== "READY") ?? [],
    depositWallet,
    readiness
  };
}

export async function runWalletFundingReadyScenario(
  input: WalletFundingReadyScenarioInput
): Promise<WalletFundingReadyScenarioResult> {
  const wallet = await bindWallet({ signer: input.signer });
  const depositWalletStatus = await getDepositWalletState();
  const depositWallet = await prepareDepositWallet({
    chainId: wallet.chainId,
    ownerAddress: wallet.address,
    signer: input.signer,
    status: depositWalletStatus
  });
  const funding = await refreshFundingState();

  return {
    depositWallet,
    funding,
    wallet
  };
}
