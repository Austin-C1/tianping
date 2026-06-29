import {
  requestWalletChallenge as requestWalletChallengeRequest,
  verifyWallet as verifyWalletRequest
} from "./wallet-client";
import type {
  VerifyWalletInput,
  VerifyWalletResult,
  WalletChallenge
} from "./wallet-client";

export type { VerifyWalletInput, VerifyWalletResult, WalletChallenge } from "./wallet-client";

export interface WalletSignerAdapter {
  getAddress(): Promise<string>;
  getChainId(): Promise<number>;
  signMessage(message: string): Promise<string>;
}

export interface BindWalletWithSignerInput {
  signer: WalletSignerAdapter;
}

export async function requestWalletChallenge(): Promise<WalletChallenge | null> {
  return requestWalletChallengeRequest();
}

export async function verifyWallet(input: VerifyWalletInput): Promise<VerifyWalletResult> {
  return verifyWalletRequest(input);
}

export async function bindWalletWithSigner(
  input: BindWalletWithSignerInput
): Promise<VerifyWalletResult> {
  const challenge = await requestWalletChallengeRequest();

  if (!challenge) {
    throw new Error("Authentication is required to bind a wallet");
  }

  const [address, chainId, signature] = await Promise.all([
    input.signer.getAddress(),
    input.signer.getChainId(),
    input.signer.signMessage(challenge.message)
  ]);

  return verifyWalletRequest({
    address,
    chainId,
    nonce: challenge.nonce,
    signature
  });
}
