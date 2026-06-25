import { WalletProofController } from "./wallet-proof.controller";
import { WalletsController } from "./wallets.controller";

describe("wallet controllers", () => {
  const request = {
    user: {
      email: "person@example.com",
      role: "USER",
      userId: "user_1"
    }
  };

  it("creates and verifies wallet proof challenges for the authenticated user", async () => {
    const walletProofService = {
      createChallenge: jest.fn().mockResolvedValue({
        expiresAt: new Date("2026-06-24T12:10:00.000Z"),
        message: "PMX wallet binding\nNonce: nonce_1",
        nonce: "nonce_1"
      }),
      verifyWallet: jest.fn().mockResolvedValue({
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        status: "CONNECTED"
      })
    };
    const controller = new WalletProofController(walletProofService as never);

    await expect(controller.createChallenge(request as never)).resolves.toMatchObject({
      nonce: "nonce_1"
    });
    await expect(
      controller.verify(
        {
          address: "0x0000000000000000000000000000000000000001",
          chainId: 137,
          nonce: "nonce_1",
          signature: "0xsig"
        },
        request as never
      )
    ).resolves.toMatchObject({
      status: "CONNECTED"
    });
    expect(walletProofService.createChallenge).toHaveBeenCalledWith(request.user);
    expect(walletProofService.verifyWallet).toHaveBeenCalledWith(
      {
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        nonce: "nonce_1",
        signature: "0xsig"
      },
      request.user
    );
  });

  it("returns unified wallet readiness for the authenticated user", async () => {
    const walletReadinessService = {
      getReadiness: jest.fn().mockResolvedValue({
        canPreview: true,
        canSign: false,
        depositWallet: {
          status: "NOT_CREATED"
        },
        funding: {
          allowance: null,
          pUsdBalance: null,
          status: "NO_DEPOSIT_WALLET"
        }
      })
    };
    const walletFundingService = {
      refreshFunding: jest.fn()
    };
    const depositWalletService = {
      getStatus: jest.fn().mockResolvedValue({
        address: null,
        chainId: null,
        status: "NOT_CREATED"
      })
    };
    const controller = new WalletsController(
      walletReadinessService as never,
      depositWalletService as never,
      walletFundingService as never
    );

    await expect(controller.getMe(request as never)).resolves.toMatchObject({
      canPreview: true,
      canSign: false
    });
    await expect(controller.getDeposit(request as never)).resolves.toEqual({
      address: null,
      chainId: null,
      status: "NOT_CREATED"
    });
    await expect(controller.getBalanceAllowance(request as never)).resolves.toEqual({
      allowance: null,
      pUsdBalance: null,
      status: "NO_DEPOSIT_WALLET"
    });
    expect(walletReadinessService.getReadiness).toHaveBeenCalledTimes(2);
    expect(walletReadinessService.getReadiness).toHaveBeenCalledWith(request.user);
    expect(depositWalletService.getStatus).toHaveBeenCalledWith(request.user);
  });

  it("routes Deposit Wallet lifecycle calls for the authenticated user", async () => {
    const walletReadinessService = {
      getReadiness: jest.fn()
    };
    const walletFundingService = {
      refreshFunding: jest.fn()
    };
    const depositWalletService = {
      createIntent: jest.fn().mockResolvedValue({
        action: "CREATE_DEPOSIT_WALLET",
        operationId: "wallet_operation_1",
        status: "INTENT_CREATED"
      }),
      getStatus: jest.fn().mockResolvedValue({
        status: "NOT_CREATED"
      }),
      submitSignedBatch: jest.fn().mockResolvedValue({
        operationId: "wallet_operation_1",
        status: "PENDING"
      })
    };
    const controller = new WalletsController(
      walletReadinessService as never,
      depositWalletService as never,
      walletFundingService as never
    );

    await expect(
      controller.createDepositWalletIntent(
        {
          chainId: 137,
          ownerAddress: "0x0000000000000000000000000000000000000001"
        },
        request as never
      )
    ).resolves.toMatchObject({
      operationId: "wallet_operation_1"
    });
    await expect(
      controller.submitDepositWalletSignedBatch(
        {
          operationId: "wallet_operation_1",
          signedBatch: { signature: "0xsig" }
        },
        request as never
      )
    ).resolves.toMatchObject({
      status: "PENDING"
    });
    await expect(controller.getDepositWalletStatus(request as never)).resolves.toEqual({
      status: "NOT_CREATED"
    });
    expect(depositWalletService.createIntent).toHaveBeenCalledWith(
      {
        chainId: 137,
        ownerAddress: "0x0000000000000000000000000000000000000001"
      },
      request.user
    );
    expect(depositWalletService.submitSignedBatch).toHaveBeenCalledWith(
      {
        operationId: "wallet_operation_1",
        signedBatch: { signature: "0xsig" }
      },
      request.user
    );
    expect(depositWalletService.getStatus).toHaveBeenCalledWith(request.user);
  });

  it("refreshes Deposit Wallet balance allowance for the authenticated user", async () => {
    const walletReadinessService = {
      getReadiness: jest.fn()
    };
    const depositWalletService = {
      getStatus: jest.fn()
    };
    const walletFundingService = {
      refreshFunding: jest.fn().mockResolvedValue({
        allowance: "100",
        pUsdBalance: "50",
        status: "READY"
      })
    };
    const controller = new WalletsController(
      walletReadinessService as never,
      depositWalletService as never,
      walletFundingService as never
    );

    await expect(controller.refreshBalanceAllowance(request as never)).resolves.toEqual({
      allowance: "100",
      pUsdBalance: "50",
      status: "READY"
    });
    expect(walletFundingService.refreshFunding).toHaveBeenCalledWith(request.user);
  });
});
