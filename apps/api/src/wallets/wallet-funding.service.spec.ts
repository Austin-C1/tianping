import { BadRequestException } from "@nestjs/common";
import {
  WalletFundingService,
  type WalletFundingProvider
} from "./wallet-funding.service";

describe("WalletFundingService", () => {
  const now = new Date("2026-06-25T10:00:00.000Z");

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createFundingRepository = () => ({
    findLatestDepositWalletFunding: jest.fn(),
    updateFundingSnapshot: jest.fn()
  });

  const createProvider = (): jest.Mocked<WalletFundingProvider> => ({
    getBalanceAllowance: jest.fn()
  });

  const createService = (
    fundingRepository: ReturnType<typeof createFundingRepository>,
    provider: jest.Mocked<WalletFundingProvider>
  ) => new (WalletFundingService as any)(fundingRepository, provider);

  it("returns NO_DEPOSIT_WALLET before a ready Deposit Wallet exists", async () => {
    const fundingRepository = createFundingRepository();
    const provider = createProvider();
    fundingRepository.findLatestDepositWalletFunding.mockResolvedValue(null);
    const service = createService(fundingRepository, provider);

    await expect(service.getFunding({ userId: "user_1" })).resolves.toEqual({
      allowance: null,
      balanceCacheStale: true,
      balanceCacheUpdatedAt: null,
      minimumOrderSize: null,
      minimumOrderSizeMet: null,
      pUsdBalance: null,
      reason: "Deposit Wallet is not ready",
      requiredAllowance: null,
      status: "NO_DEPOSIT_WALLET"
    });
    expect(provider.getBalanceAllowance).not.toHaveBeenCalled();
  });

  it("marks cached funding stale when the balance allowance cache is expired", async () => {
    const fundingRepository = createFundingRepository();
    const provider = createProvider();
    fundingRepository.findLatestDepositWalletFunding.mockResolvedValue(
      depositWallet({
        balanceAllowanceUpdatedAt: new Date("2026-06-25T09:50:00.000Z"),
        exchangeAllowance: "100",
        pUsdBalance: "100"
      })
    );
    const service = createService(fundingRepository, provider);

    await expect(
      service.getFunding({ userId: "user_1" }, { requiredAmountUsd: 10, minimumOrderSize: 5 })
    ).resolves.toMatchObject({
      allowance: "100",
      balanceCacheStale: true,
      minimumOrderSize: "5",
      minimumOrderSizeMet: true,
      pUsdBalance: "100",
      reason: "CLOB balance allowance cache is stale",
      requiredAllowance: "10",
      status: "CACHE_STALE"
    });
  });

  it("blocks funding when fresh pUSD balance is insufficient", async () => {
    const fundingRepository = createFundingRepository();
    const provider = createProvider();
    fundingRepository.findLatestDepositWalletFunding.mockResolvedValue(
      depositWallet({
        balanceAllowanceUpdatedAt: new Date("2026-06-25T09:59:00.000Z"),
        exchangeAllowance: "100",
        pUsdBalance: "0"
      })
    );
    const service = createService(fundingRepository, provider);

    await expect(
      service.getFunding({ userId: "user_1" }, { requiredAmountUsd: 10 })
    ).resolves.toMatchObject({
      reason: "Deposit Wallet has no pUSD",
      status: "NO_PUSD"
    });
  });

  it("blocks funding when fresh allowance is lower than the required amount", async () => {
    const fundingRepository = createFundingRepository();
    const provider = createProvider();
    fundingRepository.findLatestDepositWalletFunding.mockResolvedValue(
      depositWallet({
        balanceAllowanceUpdatedAt: new Date("2026-06-25T09:59:00.000Z"),
        exchangeAllowance: "2",
        pUsdBalance: "100"
      })
    );
    const service = createService(fundingRepository, provider);

    await expect(
      service.getFunding({ userId: "user_1" }, { requiredAmountUsd: 10 })
    ).resolves.toMatchObject({
      reason: "CLOB exchange allowance is insufficient",
      status: "ALLOWANCE_MISSING"
    });
  });

  it("refreshes balance allowance through the configured provider and returns READY funding", async () => {
    const fundingRepository = createFundingRepository();
    const provider = createProvider();
    fundingRepository.findLatestDepositWalletFunding
      .mockResolvedValueOnce(
        depositWallet({
          balanceAllowanceUpdatedAt: null,
          exchangeAllowance: null,
          pUsdBalance: null
        })
      )
      .mockResolvedValueOnce(
        depositWallet({
          balanceAllowanceUpdatedAt: now,
          exchangeAllowance: "100",
          pUsdBalance: "50"
        })
      );
    provider.getBalanceAllowance.mockResolvedValue({
      allowance: "100",
      pUsdBalance: "50",
      raw: { balance: "50", allowances: { exchange: "100" } }
    });
    fundingRepository.updateFundingSnapshot.mockResolvedValue({});
    const service = createService(fundingRepository, provider);

    await expect(
      service.refreshFunding({ userId: "user_1" }, { requiredAmountUsd: 10 })
    ).resolves.toMatchObject({
      allowance: "100",
      balanceCacheStale: false,
      pUsdBalance: "50",
      requiredAllowance: "10",
      status: "READY"
    });
    expect(provider.getBalanceAllowance).toHaveBeenCalledWith({
      chainId: 137,
      depositWalletAddress: "0x2222222222222222222222222222222222222222"
    });
    expect(fundingRepository.updateFundingSnapshot).toHaveBeenCalledWith({
      balanceAllowanceRaw: {
        balance: "50",
        allowances: { exchange: "100" }
      },
      balanceAllowanceUpdatedAt: now,
      depositWalletId: "deposit_wallet_1",
      exchangeAllowance: "100",
      pUsdBalance: "50"
    });
  });

  it("rejects refresh when the user has no ready Deposit Wallet", async () => {
    const fundingRepository = createFundingRepository();
    const provider = createProvider();
    fundingRepository.findLatestDepositWalletFunding.mockResolvedValue(null);
    const service = createService(fundingRepository, provider);

    await expect(service.refreshFunding({ userId: "user_1" })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});

function depositWallet(overrides: object) {
  return {
    address: "0x2222222222222222222222222222222222222222",
    balanceAllowanceUpdatedAt: null,
    chainId: 137,
    exchangeAllowance: null,
    id: "deposit_wallet_1",
    pUsdBalance: null,
    status: "READY",
    ...overrides
  };
}
