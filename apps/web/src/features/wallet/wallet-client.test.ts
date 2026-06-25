import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, saveAccessToken } from "../auth/auth-client";
import {
  createDepositWalletIntent,
  getDepositWalletStatus,
  getWalletReadiness,
  requestWalletChallenge,
  refreshBalanceAllowance,
  submitDepositWalletSignedBatch,
  verifyWallet
} from "./wallet-client";

describe("wallet-client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it("loads authenticated wallet readiness", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          canPreview: true,
          canSign: false,
          eoa: { status: "NOT_CONNECTED", address: null, chainId: null }
        })
      }))
    );

    await expect(getWalletReadiness()).resolves.toMatchObject({
      canPreview: true,
      canSign: false,
      eoa: { status: "NOT_CONNECTED" }
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/wallets/me", {
      headers: { Authorization: "Bearer token" }
    });
  });

  it("does not request readiness without an access token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getWalletReadiness()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads authenticated Deposit Wallet relayer status", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          address: "0x2222222222222222222222222222222222222222",
          chainId: 137,
          latestRelayerTransaction: {
            relayerTransactionId: "relayer_tx_1",
            status: "CONFIRMED"
          },
          ownerAddress: "0x0000000000000000000000000000000000000001",
          status: "READY",
          updatedAt: "2026-06-24T12:02:00.000Z"
        })
      }))
    );

    await expect(getDepositWalletStatus()).resolves.toMatchObject({
      address: "0x2222222222222222222222222222222222222222",
      latestRelayerTransaction: {
        status: "CONFIRMED"
      },
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "READY"
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/wallets/deposit/status", {
      headers: { Authorization: "Bearer token" }
    });
  });

  it("does not request Deposit Wallet status without an access token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDepositWalletStatus()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests a wallet challenge and submits a signed proof", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            expiresAt: "2026-06-24T12:10:00.000Z",
            message: "PMX wallet binding\nNonce: nonce_1",
            nonce: "nonce_1"
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            address: "0x0000000000000000000000000000000000000001",
            chainId: 137,
            status: "CONNECTED"
          })
        })
    );

    await expect(requestWalletChallenge()).resolves.toEqual({
      expiresAt: "2026-06-24T12:10:00.000Z",
      message: "PMX wallet binding\nNonce: nonce_1",
      nonce: "nonce_1"
    });
    await expect(
      verifyWallet({
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        nonce: "nonce_1",
        signature: "0xsig"
      })
    ).resolves.toEqual({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 137,
      status: "CONNECTED"
    });
    expect(fetch).toHaveBeenNthCalledWith(1, "http://api.test/wallets/nonce", {
      headers: { Authorization: "Bearer token" },
      method: "POST"
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "http://api.test/wallets/verify", {
      body: JSON.stringify({
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        nonce: "nonce_1",
        signature: "0xsig"
      }),
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  });

  it("creates and submits Deposit Wallet browser signed batch payloads", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            action: "CREATE_DEPOSIT_WALLET",
            depositWalletAddress: "0x2222222222222222222222222222222222222222",
            operationId: "wallet_operation_1",
            ownerAddress: "0x0000000000000000000000000000000000000001",
            relayerRequest: {
              from: "0x0000000000000000000000000000000000000001",
              to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
              type: "WALLET-CREATE"
            },
            status: "INTENT_CREATED"
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            operationId: "wallet_operation_1",
            relayerTransactionId: "relayer_tx_1",
            status: "PENDING"
          })
        })
    );

    await expect(
      createDepositWalletIntent({
        chainId: 137,
        ownerAddress: "0x0000000000000000000000000000000000000001"
      })
    ).resolves.toMatchObject({
      operationId: "wallet_operation_1",
      relayerRequest: {
        type: "WALLET-CREATE"
      }
    });
    await expect(
      submitDepositWalletSignedBatch({
        operationId: "wallet_operation_1",
        signedBatch: {
          ownerSignature: "0xsig",
          relayerRequest: {
            from: "0x0000000000000000000000000000000000000001",
            to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
            type: "WALLET-CREATE"
          }
        }
      })
    ).resolves.toMatchObject({
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });
    expect(fetch).toHaveBeenNthCalledWith(1, "http://api.test/wallets/deposit/create-intent", {
      body: JSON.stringify({
        chainId: 137,
        ownerAddress: "0x0000000000000000000000000000000000000001"
      }),
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "http://api.test/wallets/deposit/submit-signed-batch", {
      body: JSON.stringify({
        operationId: "wallet_operation_1",
        signedBatch: {
          ownerSignature: "0xsig",
          relayerRequest: {
            from: "0x0000000000000000000000000000000000000001",
            to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
            type: "WALLET-CREATE"
          }
        }
      }),
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  });

  it("refreshes authenticated balance allowance cache", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          allowance: "100",
          balanceCacheUpdatedAt: "2026-06-25T10:00:00.000Z",
          pUsdBalance: "50",
          status: "READY"
        })
      }))
    );

    await expect(refreshBalanceAllowance()).resolves.toMatchObject({
      allowance: "100",
      pUsdBalance: "50",
      status: "READY"
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/wallets/balance-allowance/refresh", {
      headers: { Authorization: "Bearer token" },
      method: "POST"
    });
  });
});
