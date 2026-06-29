import type {
  CreateDepositWalletIntentInput,
  CreateDepositWalletIntentResult,
  DepositWalletStatus,
  SubmitDepositWalletSignedBatchInput,
  SubmitDepositWalletSignedBatchResult,
  VerifyWalletInput,
  VerifyWalletResult,
  WalletChallenge,
  WalletFundingState,
  WalletReadiness
} from "@pmx/api-client";
import { createWebApiClient, readAccessToken } from "../api/api";

export type {
  CreateDepositWalletIntentInput,
  CreateDepositWalletIntentResult,
  DepositWalletStatus,
  SubmitDepositWalletSignedBatchInput,
  SubmitDepositWalletSignedBatchResult,
  VerifyWalletInput,
  VerifyWalletResult,
  WalletChallenge,
  WalletFundingState,
  WalletReadiness
} from "@pmx/api-client";

export type WalletReadinessGate = WalletReadiness["gates"][number];
export type WalletFundingStatus = WalletFundingState["status"];

export async function getWalletReadiness(): Promise<WalletReadiness | null> {
  if (!readAccessToken()) {
    return null;
  }

  return createWebApiClient().wallets.getReadiness();
}

export async function getDepositWalletStatus(): Promise<DepositWalletStatus | null> {
  if (!readAccessToken()) {
    return null;
  }

  return createWebApiClient().wallets.getDepositWalletStatus();
}

export async function refreshBalanceAllowance(): Promise<WalletFundingState> {
  if (!readAccessToken()) {
    throw new Error("Not authenticated");
  }

  return createWebApiClient().wallets.refreshBalanceAllowance();
}

export async function createDepositWalletIntent(
  input: CreateDepositWalletIntentInput
): Promise<CreateDepositWalletIntentResult> {
  if (!readAccessToken()) {
    throw new Error("Not authenticated");
  }

  return createWebApiClient().wallets.createDepositWalletIntent(input);
}

export async function submitDepositWalletSignedBatch(
  input: SubmitDepositWalletSignedBatchInput
): Promise<SubmitDepositWalletSignedBatchResult> {
  if (!readAccessToken()) {
    throw new Error("Not authenticated");
  }

  return createWebApiClient().wallets.submitDepositWalletSignedBatch(input);
}

export async function requestWalletChallenge(): Promise<WalletChallenge | null> {
  if (!readAccessToken()) {
    return null;
  }

  return createWebApiClient().wallets.requestChallenge();
}

export async function verifyWallet(input: VerifyWalletInput): Promise<VerifyWalletResult> {
  if (!readAccessToken()) {
    throw new Error("Not authenticated");
  }

  return createWebApiClient().wallets.verify(input);
}
