import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveAccessToken } from "../../features/auth/auth-client";
import {
  runWalletFundingBlockedScenario,
  runWalletFundingReadyScenario
} from "./wallet-funding-readiness.flow";

describe("wallet-funding-readiness flow scenarios", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("loads wallet and funding blocking state without browser automation", async () => {
    saveAccessToken("token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          canPreview: true,
          canSign: false,
          depositWallet: {
            address: null,
            chainId: null,
            status: "NOT_CREATED"
          },
          eoa: {
            address: null,
            chainId: null,
            status: "NOT_CONNECTED"
          },
          funding: {
            allowance: null,
            balanceCacheStale: true,
            balanceCacheUpdatedAt: null,
            minimumOrderSize: null,
            minimumOrderSizeMet: null,
            pUsdBalance: null,
            reason: "Deposit Wallet is not ready",
            requiredAllowance: null,
            status: "NO_DEPOSIT_WALLET"
          },
          gates: [
            {
              key: "wallet-binding",
              reason: "EOA wallet is not connected",
              status: "PENDING"
            },
            {
              key: "deposit-wallet",
              reason: "Deposit Wallet is not created",
              status: "PENDING"
            }
          ],
          region: {
            status: "NOT_CHECKED"
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: null,
          chainId: null,
          latestOperation: null,
          latestRelayerTransaction: null,
          ownerAddress: null,
          status: "NOT_CREATED",
          updatedAt: null
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(runWalletFundingBlockedScenario()).resolves.toMatchObject({
      blockingGates: [
        {
          key: "wallet-binding",
          reason: "EOA wallet is not connected",
          status: "PENDING"
        },
        {
          key: "deposit-wallet",
          reason: "Deposit Wallet is not created",
          status: "PENDING"
        }
      ],
      depositWallet: {
        status: "NOT_CREATED"
      },
      readiness: {
        canSign: false,
        funding: {
          status: "NO_DEPOSIT_WALLET"
        }
      }
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://api.test/wallets/me", {
      headers: { Authorization: "Bearer token" }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://api.test/wallets/deposit/status", {
      headers: { Authorization: "Bearer token" }
    });
  });

  it("binds a mock wallet, creates a Deposit Wallet intent, and refreshes funding readiness", async () => {
    saveAccessToken("token");
    const signer = {
      getAddress: vi.fn(async () => "0x0000000000000000000000000000000000000001"),
      getChainId: vi.fn(async () => 137),
      signDepositWalletBatch: vi.fn(async () => ({
        ownerSignature: "0xdeposit-sig"
      })),
      signMessage: vi.fn(async () => "0xwallet-sig")
    };
    const fetchMock = vi
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
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: null,
          chainId: null,
          latestOperation: null,
          latestRelayerTransaction: null,
          ownerAddress: null,
          status: "NOT_CREATED",
          updatedAt: null
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          action: "CREATE_DEPOSIT_WALLET",
          chainId: 137,
          depositWalletAddress: null,
          operationId: "wallet_operation_1",
          ownerAddress: "0x0000000000000000000000000000000000000001",
          relayerRequest: {
            type: "WALLET-CREATE"
          },
          status: "INTENT_CREATED",
          typedData: {
            action: "CREATE_DEPOSIT_WALLET",
            chainId: 137,
            ownerAddress: "0x0000000000000000000000000000000000000001"
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          depositWalletAddress: "0x2222222222222222222222222222222222222222",
          failureReason: null,
          operationId: "wallet_operation_1",
          relayerTransactionId: "relayer_tx_1",
          status: "PENDING"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowance: "100",
          balanceCacheStale: false,
          balanceCacheUpdatedAt: "2026-06-25T10:01:00.000Z",
          minimumOrderSize: "5",
          minimumOrderSizeMet: true,
          pUsdBalance: "50",
          reason: "pUSD balance and allowance are ready",
          requiredAllowance: "10",
          status: "READY"
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(runWalletFundingReadyScenario({ signer })).resolves.toMatchObject({
      depositWallet: {
        relayerTransactionId: "relayer_tx_1",
        status: "PENDING"
      },
      funding: {
        pUsdBalance: "50",
        status: "READY"
      },
      wallet: {
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        status: "CONNECTED"
      }
    });

    expect(signer.signMessage).toHaveBeenCalledWith("PMX wallet binding\nNonce: nonce_1");
    expect(signer.signDepositWalletBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: "wallet_operation_1"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(6, "http://api.test/wallets/balance-allowance/refresh", {
      headers: { Authorization: "Bearer token" },
      method: "POST"
    });
  });
});
