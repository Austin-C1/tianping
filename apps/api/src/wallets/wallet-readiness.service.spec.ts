import { WalletReadinessService } from "./wallet-readiness.service";
import type { WalletFundingState } from "./wallet-funding.service";

describe("WalletReadinessService", () => {
  const createPrisma = () => ({
    depositWallet: {
      findFirst: jest.fn()
    },
    wallet: {
      findFirst: jest.fn()
    }
  });
  const createFundingService = (funding: WalletFundingState = {
    allowance: null,
    balanceCacheStale: true,
    balanceCacheUpdatedAt: null,
    minimumOrderSize: null,
    minimumOrderSizeMet: null,
    pUsdBalance: null,
    reason: "Deposit Wallet is not ready",
    requiredAllowance: null,
    status: "NO_DEPOSIT_WALLET" as const
  }) => ({
    getFunding: jest.fn().mockResolvedValue(funding)
  });

  it("returns preview-only readiness when no wallets are connected", async () => {
    const prisma = createPrisma();
    const fundingService = createFundingService();
    prisma.depositWallet.findFirst.mockResolvedValue(null);
    prisma.wallet.findFirst.mockResolvedValue(null);
    const service = new WalletReadinessService(prisma as never, fundingService as never);

    await expect(service.getReadiness({ userId: "user_1" })).resolves.toEqual({
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
        },
        {
          key: "funding-allowance",
          reason: "Deposit Wallet is not ready",
          status: "PENDING"
        },
        {
          key: "region-risk",
          reason: "Region risk check is not complete",
          status: "PENDING"
        }
      ],
      region: {
        status: "NOT_CHECKED"
      }
    });
    expect(prisma.wallet.findFirst).toHaveBeenNthCalledWith(1, {
      orderBy: { updatedAt: "desc" },
      select: { address: true, chainId: true },
      where: { type: "EOA", userId: "user_1" }
    });
    expect(prisma.wallet.findFirst).toHaveBeenNthCalledWith(2, {
      orderBy: { updatedAt: "desc" },
      select: { address: true, chainId: true },
      where: { type: "DEPOSIT", userId: "user_1" }
    });
    expect(prisma.depositWallet.findFirst).toHaveBeenCalledWith({
      orderBy: { updatedAt: "desc" },
      select: { address: true, chainId: true, status: true },
      where: { userId: "user_1" }
    });
    expect(fundingService.getFunding).toHaveBeenCalledWith({ userId: "user_1" }, undefined);
  });

  it("marks wallet binding ready when an EOA wallet exists", async () => {
    const prisma = createPrisma();
    const fundingService = createFundingService();
    prisma.depositWallet.findFirst.mockResolvedValue(null);
    prisma.wallet.findFirst
      .mockResolvedValueOnce({
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137
      })
      .mockResolvedValueOnce(null);
    const service = new WalletReadinessService(prisma as never, fundingService as never);

    await expect(service.getReadiness({ userId: "user_1" })).resolves.toMatchObject({
      canPreview: true,
      canSign: false,
      depositWallet: {
        status: "NOT_CREATED"
      },
      eoa: {
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        status: "CONNECTED"
      },
      gates: [
        {
          key: "wallet-binding",
          reason: "EOA wallet is connected",
          status: "READY"
        },
        {
          key: "deposit-wallet",
          reason: "Deposit Wallet is not created",
          status: "PENDING"
        },
        expect.any(Object),
        expect.any(Object)
      ]
    });
  });

  it("marks Deposit Wallet ready only when the production DepositWallet row is READY", async () => {
    const prisma = createPrisma();
    const fundingService = createFundingService({
      allowance: "100",
      balanceCacheStale: false,
      balanceCacheUpdatedAt: new Date("2026-06-25T10:00:00.000Z"),
      minimumOrderSize: "5",
      minimumOrderSizeMet: true,
      pUsdBalance: "50",
      reason: "pUSD balance and allowance are ready",
      requiredAllowance: "10",
      status: "READY" as const
    });
    prisma.wallet.findFirst.mockResolvedValueOnce({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 137
    });
    prisma.depositWallet.findFirst.mockResolvedValue({
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      status: "READY"
    });
    const service = new WalletReadinessService(prisma as never, fundingService as never);

    await expect(
      service.getReadiness(
        { userId: "user_1" },
        { minimumOrderSize: 5, requiredAmountUsd: 10 }
      )
    ).resolves.toMatchObject({
      canSign: false,
      depositWallet: {
        address: "0x2222222222222222222222222222222222222222",
        chainId: 137,
        status: "READY"
      },
      funding: {
        allowance: "100",
        pUsdBalance: "50",
        requiredAllowance: "10",
        status: "READY"
      },
      gates: [
        expect.any(Object),
        {
          key: "deposit-wallet",
          reason: "Deposit Wallet is ready",
          status: "READY"
        },
        {
          key: "funding-allowance",
          reason: "pUSD balance and allowance are ready",
          status: "READY"
        },
        expect.any(Object)
      ]
    });
    expect(prisma.wallet.findFirst).toHaveBeenCalledTimes(1);
    expect(fundingService.getFunding).toHaveBeenCalledWith(
      { userId: "user_1" },
      { minimumOrderSize: 5, requiredAmountUsd: 10 }
    );
  });
});
