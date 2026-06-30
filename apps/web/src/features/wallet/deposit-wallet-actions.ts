import {
  createDepositWalletIntent as createDepositWalletIntentRequest,
  getDepositWalletStatus as getDepositWalletStatusRequest,
  submitDepositWalletSignedBatch as submitDepositWalletSignedBatchRequest
} from "./wallet-client";
import type { WalletSignerAdapter } from "./wallet-signing-actions";
import type {
  CreateDepositWalletIntentInput,
  CreateDepositWalletIntentResult,
  DepositWalletStatus,
  SubmitDepositWalletSignedBatchInput,
  SubmitDepositWalletSignedBatchResult
} from "./wallet-client";

export type {
  CreateDepositWalletIntentInput,
  CreateDepositWalletIntentResult,
  DepositWalletStatus,
  SubmitDepositWalletSignedBatchInput,
  SubmitDepositWalletSignedBatchResult
} from "./wallet-client";

export interface DepositWalletSignerAdapter extends WalletSignerAdapter {
  signDepositWalletBatch(intent: CreateDepositWalletIntentResult): Promise<Record<string, unknown>>;
}

export interface EnsureDepositWalletInput {
  chainId: number;
  ownerAddress: string;
  signer: DepositWalletSignerAdapter;
  status?: DepositWalletStatus | null;
}

export async function getDepositWalletStatus(): Promise<DepositWalletStatus | null> {
  return getDepositWalletStatusRequest();
}

export async function loadDepositWalletStatus(): Promise<DepositWalletStatus | null> {
  return getDepositWalletStatus();
}

export async function createDepositWalletIntent(
  input: CreateDepositWalletIntentInput
): Promise<CreateDepositWalletIntentResult> {
  return createDepositWalletIntentRequest(input);
}

export async function submitDepositWalletSignedBatch(
  input: SubmitDepositWalletSignedBatchInput
): Promise<SubmitDepositWalletSignedBatchResult> {
  return submitDepositWalletSignedBatchRequest(input);
}

export async function ensureDepositWallet(
  input: EnsureDepositWalletInput
): Promise<DepositWalletStatus | SubmitDepositWalletSignedBatchResult> {
  const status = input.status ?? (await loadDepositWalletStatus());

  if (status?.status === "READY") {
    return status;
  }

  const intent = await createDepositWalletIntentRequest({
    chainId: input.chainId,
    ownerAddress: input.ownerAddress
  });
  const signedBatch = await input.signer.signDepositWalletBatch(intent);

  return submitDepositWalletSignedBatchRequest({
    operationId: intent.operationId,
    signedBatch
  });
}
