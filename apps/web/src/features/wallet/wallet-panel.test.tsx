import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/language-provider";
import { WalletPanel } from "./wallet-panel";
import * as walletClient from "./wallet-client";

vi.mock("./wallet-client");

describe("WalletPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(walletClient.createDepositWalletIntent).mockReset();
    vi.mocked(walletClient.getDepositWalletStatus).mockReset();
    vi.mocked(walletClient.getWalletReadiness).mockReset();
    vi.mocked(walletClient.refreshBalanceAllowance).mockReset();
    vi.mocked(walletClient.requestWalletChallenge).mockReset();
    vi.mocked(walletClient.submitDepositWalletSignedBatch).mockReset();
    vi.mocked(walletClient.verifyWallet).mockReset();
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: undefined
    });
    window.localStorage.clear();
    window.localStorage.setItem("pmx.locale", "en");
    vi.mocked(walletClient.getDepositWalletStatus).mockResolvedValue(null);
  });

  it("shows disconnected wallet readiness", async () => {
    vi.mocked(walletClient.getWalletReadiness).mockResolvedValue(disconnectedReadiness());

    renderWalletPanel();

    expect(await screen.findByRole("heading", { name: "Wallet status" })).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(screen.getByText("Deposit Wallet")).toBeInTheDocument();
    expect(screen.getByText("Not created")).toBeInTheDocument();
    expect(screen.getByText("Funding and approvals")).toBeInTheDocument();
    expect(screen.getByText("NO_DEPOSIT_WALLET")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Fund or withdraw through your Polymarket Deposit Wallet. PMX does not route funds through a Platform Wallet in this phase."
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not checked")).toHaveLength(1);
  });

  it("shows connected EOA wallet details", async () => {
    vi.mocked(walletClient.getWalletReadiness).mockResolvedValue({
      ...disconnectedReadiness(),
      eoa: {
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        status: "CONNECTED"
      },
      gates: []
    });

    renderWalletPanel();

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("0x0000000000000000000000000000000000000001")).toBeInTheDocument();
    expect(screen.getByText("Chain 137")).toBeInTheDocument();
  });

  it("shows Deposit Wallet address, owner, and relayer status", async () => {
    vi.mocked(walletClient.getWalletReadiness).mockResolvedValue({
      ...disconnectedReadiness(),
      depositWallet: {
        address: "0x2222222222222222222222222222222222222222",
        chainId: 137,
        status: "READY"
      }
    });
    vi.mocked(walletClient.getDepositWalletStatus).mockResolvedValue({
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      latestOperation: {
        failureReason: null,
        id: "wallet_operation_1",
        status: "SUBMITTED",
        type: "CREATE_DEPOSIT_WALLET",
        updatedAt: "2026-06-24T12:01:00.000Z"
      },
      latestRelayerTransaction: {
        failureReason: null,
        id: "relayer_transaction_1",
        relayerTransactionId: "relayer_tx_1",
        status: "CONFIRMED",
        updatedAt: "2026-06-24T12:02:00.000Z"
      },
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "READY",
      updatedAt: "2026-06-24T12:02:00.000Z"
    });

    renderWalletPanel();

    expect(await screen.findByText("0x2222222222222222222222222222222222222222")).toBeInTheDocument();
    expect(screen.getByText("Owner 0x0000000000000000000000000000000000000001")).toBeInTheDocument();
    expect(screen.getByText("Relayer CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText("Updated 6/24/2026, 12:02:00 PM")).toBeInTheDocument();
  });

  it("shows Deposit Wallet relayer failure reasons in Account", async () => {
    vi.mocked(walletClient.getWalletReadiness).mockResolvedValue({
      ...disconnectedReadiness(),
      depositWallet: {
        address: null,
        chainId: 137,
        status: "FAILED"
      }
    });
    vi.mocked(walletClient.getDepositWalletStatus).mockResolvedValue({
      address: null,
      chainId: 137,
      latestOperation: {
        failureReason: "relayer unavailable",
        id: "wallet_operation_1",
        status: "FAILED",
        type: "CREATE_DEPOSIT_WALLET",
        updatedAt: "2026-06-24T12:01:00.000Z"
      },
      latestRelayerTransaction: {
        failureReason: "relayer unavailable",
        id: "relayer_transaction_1",
        relayerTransactionId: null,
        status: "FAILED",
        updatedAt: "2026-06-24T12:02:00.000Z"
      },
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "FAILED",
      updatedAt: "2026-06-24T12:02:00.000Z"
    });

    renderWalletPanel();

    expect(await screen.findByText("Relayer FAILED")).toBeInTheDocument();
    expect(screen.getByText("Failure relayer unavailable")).toBeInTheDocument();
  });

  it("shows pUSD balance, allowance, cache time, and refreshes funding", async () => {
    vi.mocked(walletClient.getWalletReadiness)
      .mockResolvedValueOnce({
        ...disconnectedReadiness(),
        funding: {
          allowance: "2",
          balanceCacheStale: false,
          balanceCacheUpdatedAt: "2026-06-25T10:00:00.000Z",
          minimumOrderSize: "5",
          minimumOrderSizeMet: true,
          pUsdBalance: "50",
          reason: "CLOB exchange allowance is insufficient",
          requiredAllowance: "10",
          status: "ALLOWANCE_MISSING"
        },
        gates: [
          disconnectedReadiness().gates[0],
          disconnectedReadiness().gates[1],
          {
            key: "funding-allowance",
            reason: "CLOB exchange allowance is insufficient",
            status: "PENDING"
          },
          disconnectedReadiness().gates[3]
        ]
      })
      .mockResolvedValueOnce({
        ...disconnectedReadiness(),
        funding: {
          allowance: "100",
          balanceCacheStale: false,
          balanceCacheUpdatedAt: "2026-06-25T10:01:00.000Z",
          minimumOrderSize: "5",
          minimumOrderSizeMet: true,
          pUsdBalance: "50",
          reason: "pUSD balance and allowance are ready",
          requiredAllowance: "10",
          status: "READY"
        },
        gates: []
      });
    vi.mocked(walletClient.refreshBalanceAllowance).mockResolvedValue({
      allowance: "100",
      balanceCacheStale: false,
      balanceCacheUpdatedAt: "2026-06-25T10:01:00.000Z",
      minimumOrderSize: null,
      minimumOrderSizeMet: null,
      pUsdBalance: "50",
      reason: "pUSD balance and allowance are ready",
      requiredAllowance: null,
      status: "READY"
    });

    renderWalletPanel();

    expect(await screen.findByText("ALLOWANCE_MISSING")).toBeInTheDocument();
    expect(screen.getByText("pUSD 50")).toBeInTheDocument();
    expect(screen.getByText("Allowance 2")).toBeInTheDocument();
    expect(screen.getByText("Required 10")).toBeInTheDocument();
    expect(screen.getByText("Updated 6/25/2026, 10:00:00 AM")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh balance" }));

    await waitFor(() => {
      expect(walletClient.refreshBalanceAllowance).toHaveBeenCalledWith();
    });
    expect(await screen.findByText("READY")).toBeInTheDocument();
  });

  it("shows the exact Deposit Wallet action before signing and submitting the browser batch", async () => {
    const ethereum = {
      request: vi
        .fn()
        .mockResolvedValueOnce("0xsig")
    };
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: ethereum
    });
    vi.mocked(walletClient.getWalletReadiness)
      .mockResolvedValueOnce({
        ...disconnectedReadiness(),
        eoa: {
          address: "0x0000000000000000000000000000000000000001",
          chainId: 137,
          status: "CONNECTED"
        },
        gates: []
      })
      .mockResolvedValueOnce({
        ...disconnectedReadiness(),
        depositWallet: {
          address: "0x2222222222222222222222222222222222222222",
          chainId: 137,
          status: "PENDING"
        },
        eoa: {
          address: "0x0000000000000000000000000000000000000001",
          chainId: 137,
          status: "CONNECTED"
        },
        gates: []
      });
    vi.mocked(walletClient.createDepositWalletIntent).mockResolvedValue({
      action: "CREATE_DEPOSIT_WALLET",
      chainId: 137,
      depositWalletAddress: "0x2222222222222222222222222222222222222222",
      operationId: "wallet_operation_1",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      relayerRequest: {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
        type: "WALLET-CREATE"
      },
      status: "INTENT_CREATED",
      typedData: {
        action: "CREATE_DEPOSIT_WALLET",
        chainId: 137,
        ownerAddress: "0x0000000000000000000000000000000000000001"
      }
    });
    vi.mocked(walletClient.submitDepositWalletSignedBatch).mockResolvedValue({
      depositWalletAddress: "0x2222222222222222222222222222222222222222",
      failureReason: null,
      operationId: "wallet_operation_1",
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });

    renderWalletPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Create Deposit Wallet" }));
    expect(await screen.findByText("Action CREATE_DEPOSIT_WALLET")).toBeInTheDocument();
    expect(screen.getByText("Owner 0x0000000000000000000000000000000000000001")).toBeInTheDocument();
    expect(screen.getByText("Deposit Wallet 0x2222222222222222222222222222222222222222")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign and submit Deposit Wallet batch" }));

    await waitFor(() => {
      expect(walletClient.submitDepositWalletSignedBatch).toHaveBeenCalledWith({
        operationId: "wallet_operation_1",
        signedBatch: {
          ownerSignature: "0xsig",
          relayerRequest: {
            from: "0x0000000000000000000000000000000000000001",
            to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
            type: "WALLET-CREATE"
          }
        }
      });
    });
    expect(ethereum.request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: [
        "PMX Deposit Wallet action\nAction: CREATE_DEPOSIT_WALLET\nOwner: 0x0000000000000000000000000000000000000001\nChain: 137\nDeposit Wallet: 0x2222222222222222222222222222222222222222",
        "0x0000000000000000000000000000000000000001"
      ]
    });
  });

  it("shows a clear message when no browser wallet provider exists", async () => {
    vi.mocked(walletClient.getWalletReadiness).mockResolvedValue(disconnectedReadiness());

    renderWalletPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Connect wallet" }));

    expect(await screen.findByText("Wallet provider not found")).toBeInTheDocument();
  });

  it("binds a browser wallet through nonce signature verification", async () => {
    const ethereum = {
      request: vi
        .fn()
        .mockResolvedValueOnce(["0x0000000000000000000000000000000000000001"])
        .mockResolvedValueOnce("0x89")
        .mockResolvedValueOnce("0xsig")
    };
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: ethereum
    });
    vi.mocked(walletClient.getWalletReadiness)
      .mockResolvedValueOnce(disconnectedReadiness())
      .mockResolvedValueOnce({
        ...disconnectedReadiness(),
        eoa: {
          address: "0x0000000000000000000000000000000000000001",
          chainId: 137,
          status: "CONNECTED"
        }
      });
    vi.mocked(walletClient.requestWalletChallenge).mockResolvedValue({
      expiresAt: "2026-06-24T12:10:00.000Z",
      message: "PMX wallet binding\nNonce: nonce_1",
      nonce: "nonce_1"
    });
    vi.mocked(walletClient.verifyWallet).mockResolvedValue({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 137,
      status: "CONNECTED"
    });

    renderWalletPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Connect wallet" }));

    await waitFor(() => {
      expect(walletClient.verifyWallet).toHaveBeenCalledWith({
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        nonce: "nonce_1",
        signature: "0xsig"
      });
    });
    expect(ethereum.request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
    expect(ethereum.request).toHaveBeenCalledWith({ method: "eth_chainId" });
    expect(ethereum.request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: ["PMX wallet binding\nNonce: nonce_1", "0x0000000000000000000000000000000000000001"]
    });
    expect(await screen.findByText("Connected")).toBeInTheDocument();
  });
});

function renderWalletPanel() {
  render(
    <LanguageProvider>
      <WalletPanel />
    </LanguageProvider>
  );
}

function disconnectedReadiness(): walletClient.WalletReadiness {
  return {
    canPreview: true,
    canSign: false,
    depositWallet: {
      address: null,
      chainId: null,
      status: "NOT_CREATED" as const
    },
    eoa: {
      address: null,
      chainId: null,
      status: "NOT_CONNECTED" as const
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
      status: "NO_DEPOSIT_WALLET" as const
    },
    gates: [
      {
        key: "wallet-binding" as const,
        reason: "EOA wallet is not connected",
        status: "PENDING" as const
      },
      {
        key: "deposit-wallet" as const,
        reason: "Deposit Wallet is not created",
        status: "PENDING" as const
      },
      {
        key: "funding-allowance" as const,
        reason: "pUSD balance and allowance are not checked",
        status: "PENDING" as const
      },
      {
        key: "region-risk" as const,
        reason: "Region risk check is not complete",
        status: "PENDING" as const
      }
    ],
    region: {
      status: "NOT_CHECKED" as const
    }
  };
}
