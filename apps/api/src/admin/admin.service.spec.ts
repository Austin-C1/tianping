import { ForbiddenException } from "@nestjs/common";
import type { OrderRouterEnvironment } from "../order-router/order-router.config";
import { AdminService } from "./admin.service";

describe("AdminService", () => {
  const createPrisma = () => ({
    user: {
      count: jest.fn()
    },
    wallet: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    depositWallet: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    marketSnapshot: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    marketQuoteSnapshot: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    order: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    rateLimitEvent: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    relayerTransaction: {
      findFirst: jest.fn()
    }
  });
  const previewEnvironment: OrderRouterEnvironment = {
    builderCodeConfigured: false,
    chainId: null,
    clobHost: "https://clob.polymarket.com",
    liveTradingEnabled: false,
    mode: "preview" as const,
    relayerConfigured: false,
    rpcConfigured: false
  };
  const createOrderRouterConfig = (environment: OrderRouterEnvironment = previewEnvironment) => ({
    getEnvironment: jest.fn(() => environment)
  });

  it("returns operations summary for admin operators", async () => {
    const prisma = createPrisma();
    prisma.user.count.mockResolvedValueOnce(7).mockResolvedValueOnce(2);
    prisma.wallet.count.mockResolvedValue(3);
    prisma.depositWallet.count.mockResolvedValue(0);
    prisma.marketSnapshot.count.mockResolvedValue(11);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(22);
    prisma.order.count.mockResolvedValue(5);
    prisma.rateLimitEvent.count.mockResolvedValue(1);
    prisma.marketSnapshot.findFirst.mockResolvedValue({
      syncedAt: new Date("2026-06-24T00:00:00.000Z")
    });
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue({
      syncedAt: new Date("2026-06-24T00:01:00.000Z")
    });
    const service = new AdminService(prisma as never, createOrderRouterConfig() as never);

    await expect(service.getSummary({ role: "ADMIN" })).resolves.toEqual({
      registeredUsers: 7,
      adminUsers: 2,
      walletsConnected: 3,
      marketsSynced: 11,
      latestMarketSyncedAt: new Date("2026-06-24T00:00:00.000Z"),
      marketQuotesSynced: 22,
      latestMarketQuoteSyncedAt: new Date("2026-06-24T00:01:00.000Z"),
      ordersPreviewed: 5,
      openRiskEvents: 1
    });
    expect(prisma.user.count).toHaveBeenNthCalledWith(1);
    expect(prisma.user.count).toHaveBeenNthCalledWith(2, {
      where: { role: "ADMIN" }
    });
    expect(prisma.wallet.count).toHaveBeenCalledWith({
      where: { type: "EOA" }
    });
    expect(prisma.marketSnapshot.count).toHaveBeenCalledWith();
    expect(prisma.marketQuoteSnapshot.count).toHaveBeenCalledWith();
    expect(prisma.marketSnapshot.findFirst).toHaveBeenCalledWith({
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true }
    });
    expect(prisma.marketQuoteSnapshot.findFirst).toHaveBeenCalledWith({
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true }
    });
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { status: "PREVIEWED" }
    });
    expect(prisma.rateLimitEvent.count).toHaveBeenCalledWith();
  });

  it("returns gate statuses from current operational data", async () => {
    const prisma = createPrisma();
    const marketSyncedAt = new Date("2026-06-23T08:00:00.000Z");
    const quoteSyncedAt = new Date("2026-06-23T08:01:00.000Z");
    const walletUpdatedAt = new Date("2026-06-23T09:00:00.000Z");
    const orderUpdatedAt = new Date("2026-06-23T10:00:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(2);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(4);
    prisma.wallet.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    prisma.depositWallet.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(4);
    prisma.marketSnapshot.findFirst.mockResolvedValue({ syncedAt: marketSyncedAt });
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue({ syncedAt: quoteSyncedAt });
    prisma.wallet.findFirst
      .mockResolvedValueOnce({ updatedAt: walletUpdatedAt })
      .mockResolvedValueOnce(null);
    prisma.depositWallet.findFirst.mockResolvedValue(null);
    prisma.relayerTransaction.findFirst.mockResolvedValue(null);
    prisma.order.findFirst.mockResolvedValue({ updatedAt: orderUpdatedAt });
    const service = new AdminService(prisma as never, createOrderRouterConfig() as never);

    await expect(service.getGates({ role: "ADMIN" })).resolves.toEqual([
      {
        key: "market-data-sync",
        title: "Market data sync",
        owner: "Engineering",
        status: "READY",
        updatedAt: marketSyncedAt
      },
      {
        key: "market-quote-sync",
        title: "Market quote sync",
        owner: "Engineering",
        status: "READY",
        updatedAt: quoteSyncedAt
      },
      {
        key: "wallet-binding-proof",
        title: "Wallet binding proof",
        owner: "Product",
        status: "READY",
        updatedAt: walletUpdatedAt
      },
      {
        key: "deposit-wallet-readiness",
        title: "Deposit Wallet readiness",
        owner: "Compliance",
        status: "PENDING",
        updatedAt: null
      },
      {
        key: "real-order-confirmation",
        title: "Real order confirmation",
        owner: "Risk",
        status: "BLOCKED",
        updatedAt: orderUpdatedAt
      }
    ]);
  });

  it("rejects non-admin operators", async () => {
    const prisma = createPrisma();
    const service = new AdminService(prisma as never, createOrderRouterConfig() as never);

    await expect(service.getSummary({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.getGates({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(() => service.getEnvironment({ role: "USER" })).toThrow(ForbiddenException);
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it("returns order router environment for admin operators", () => {
    const prisma = createPrisma();
    const orderRouterConfig = createOrderRouterConfig({
      builderCodeConfigured: true,
      chainId: 137,
      clobHost: "https://clob.polymarket.com",
      liveTradingEnabled: false,
      mode: "paper",
      relayerConfigured: true,
      rpcConfigured: true
    });
    const service = new AdminService(prisma as never, orderRouterConfig as never);

    expect(service.getEnvironment({ role: "ADMIN" })).toEqual({
      builderCodeConfigured: true,
      chainId: 137,
      clobHost: "https://clob.polymarket.com",
      liveTradingEnabled: false,
      mode: "paper",
      relayerConfigured: true,
      rpcConfigured: true
    });
    expect(orderRouterConfig.getEnvironment).toHaveBeenCalledWith();
  });

  it("marks Deposit Wallet gate ready from production DepositWallet rows", async () => {
    const prisma = createPrisma();
    const depositUpdatedAt = new Date("2026-06-24T12:00:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(0);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(0);
    prisma.wallet.count.mockResolvedValue(0);
    prisma.depositWallet.count.mockResolvedValue(1);
    prisma.marketSnapshot.findFirst.mockResolvedValue(null);
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue(null);
    prisma.wallet.findFirst.mockResolvedValue(null);
    prisma.depositWallet.findFirst.mockResolvedValue({ updatedAt: depositUpdatedAt });
    prisma.relayerTransaction.findFirst.mockResolvedValue(null);
    prisma.order.findFirst.mockResolvedValue(null);
    const service = new AdminService(prisma as never, createOrderRouterConfig() as never);

    await expect(service.getGates({ role: "ADMIN" })).resolves.toEqual(
      expect.arrayContaining([
        {
          key: "deposit-wallet-readiness",
          owner: "Compliance",
          status: "READY",
          title: "Deposit Wallet readiness",
          updatedAt: depositUpdatedAt
        }
      ])
    );
    expect(prisma.depositWallet.count).toHaveBeenCalledWith({
      where: { status: "READY" }
    });
  });

  it("surfaces the latest failed relayer reason in the Deposit Wallet admin gate", async () => {
    const prisma = createPrisma();
    const failedAt = new Date("2026-06-24T12:03:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(0);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(0);
    prisma.wallet.count.mockResolvedValue(1);
    prisma.depositWallet.count.mockResolvedValue(0);
    prisma.marketSnapshot.findFirst.mockResolvedValue(null);
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue(null);
    prisma.wallet.findFirst.mockResolvedValue({ updatedAt: failedAt });
    prisma.depositWallet.findFirst.mockResolvedValue({ updatedAt: failedAt });
    prisma.relayerTransaction.findFirst.mockResolvedValue({
      failureReason: "relayer unavailable",
      relayerTransactionId: null,
      status: "FAILED",
      updatedAt: failedAt
    });
    prisma.order.findFirst.mockResolvedValue(null);
    const service = new AdminService(prisma as never, createOrderRouterConfig() as never);

    await expect(service.getGates({ role: "ADMIN" })).resolves.toEqual(
      expect.arrayContaining([
        {
          details: "relayer unavailable",
          key: "deposit-wallet-readiness",
          owner: "Compliance",
          status: "BLOCKED",
          title: "Deposit Wallet readiness",
          updatedAt: failedAt
        }
      ])
    );
    expect(prisma.relayerTransaction.findFirst).toHaveBeenCalledWith({
      orderBy: { updatedAt: "desc" },
      select: {
        failureReason: true,
        relayerTransactionId: true,
        status: true,
        updatedAt: true
      },
      where: {
        status: "FAILED"
      }
    });
  });
});
