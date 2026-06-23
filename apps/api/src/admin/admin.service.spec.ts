import { ForbiddenException } from "@nestjs/common";
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
    marketSnapshot: {
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
    }
  });

  it("returns operations summary for admin operators", async () => {
    const prisma = createPrisma();
    prisma.user.count.mockResolvedValueOnce(7).mockResolvedValueOnce(2);
    prisma.wallet.count.mockResolvedValue(3);
    prisma.marketSnapshot.count.mockResolvedValue(11);
    prisma.order.count.mockResolvedValue(5);
    prisma.rateLimitEvent.count.mockResolvedValue(1);
    const service = new AdminService(prisma as never);

    await expect(service.getSummary({ role: "ADMIN" })).resolves.toEqual({
      registeredUsers: 7,
      adminUsers: 2,
      walletsConnected: 3,
      marketsSynced: 11,
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
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { status: "PREVIEWED" }
    });
    expect(prisma.rateLimitEvent.count).toHaveBeenCalledWith();
  });

  it("returns gate statuses from current operational data", async () => {
    const prisma = createPrisma();
    const marketSyncedAt = new Date("2026-06-23T08:00:00.000Z");
    const walletUpdatedAt = new Date("2026-06-23T09:00:00.000Z");
    const orderUpdatedAt = new Date("2026-06-23T10:00:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(2);
    prisma.wallet.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    prisma.order.count.mockResolvedValue(4);
    prisma.marketSnapshot.findFirst.mockResolvedValue({ syncedAt: marketSyncedAt });
    prisma.wallet.findFirst
      .mockResolvedValueOnce({ updatedAt: walletUpdatedAt })
      .mockResolvedValueOnce(null);
    prisma.order.findFirst.mockResolvedValue({ updatedAt: orderUpdatedAt });
    const service = new AdminService(prisma as never);

    await expect(service.getGates({ role: "ADMIN" })).resolves.toEqual([
      {
        key: "market-data-sync",
        title: "Market data sync",
        owner: "Engineering",
        status: "READY",
        updatedAt: marketSyncedAt
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
    const service = new AdminService(prisma as never);

    await expect(service.getSummary({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.getGates({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(prisma.user.count).not.toHaveBeenCalled();
  });
});
