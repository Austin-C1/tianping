import { ForbiddenException } from "@nestjs/common";
import { MarketsService, type PolymarketMarketSource } from "./markets.service";

describe("MarketsService", () => {
  const createPrisma = () => ({
    marketSnapshot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn()
    }
  });

  const createClient = (items: PolymarketMarketSource[]) => ({
    fetchActiveMarkets: jest.fn().mockResolvedValue(items)
  });

  it("syncs active Polymarket markets into snapshots", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.upsert.mockResolvedValue({});
    const client = createClient([
      {
        id: "market_1",
        slug: "btc-100k",
        question: "Will BTC close above $100k this week?",
        active: true,
        closed: false,
        category: "Crypto",
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.52","0.48"]',
        volume: "12345.67",
        liquidity: "890.12"
      }
    ]);
    const service = new MarketsService(prisma as never, client as never);

    await expect(service.syncActiveMarkets({ role: "ADMIN" })).resolves.toEqual({
      synced: 1,
      failed: 0
    });
    expect(client.fetchActiveMarkets).toHaveBeenCalledWith(50);
    expect(prisma.marketSnapshot.upsert).toHaveBeenCalledWith({
      where: { marketId: "market_1" },
      update: {
        active: true,
        category: "Crypto",
        closed: false,
        liquidity: "890.12",
        outcomePrices: ["0.52", "0.48"],
        outcomes: ["Yes", "No"],
        question: "Will BTC close above $100k this week?",
        raw: expect.objectContaining({ id: "market_1" }),
        slug: "btc-100k",
        syncedAt: expect.any(Date),
        volume: "12345.67"
      },
      create: {
        active: true,
        category: "Crypto",
        closed: false,
        liquidity: "890.12",
        marketId: "market_1",
        outcomePrices: ["0.52", "0.48"],
        outcomes: ["Yes", "No"],
        question: "Will BTC close above $100k this week?",
        raw: expect.objectContaining({ id: "market_1" }),
        slug: "btc-100k",
        syncedAt: expect.any(Date),
        volume: "12345.67"
      }
    });
  });

  it("rejects market sync for non-admin operators", async () => {
    const prisma = createPrisma();
    const client = createClient([]);
    const service = new MarketsService(prisma as never, client as never);

    await expect(service.syncActiveMarkets({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(client.fetchActiveMarkets).not.toHaveBeenCalled();
  });

  it("returns sync failure details when Gamma is unreachable", async () => {
    const prisma = createPrisma();
    const client = {
      fetchActiveMarkets: jest.fn().mockRejectedValue(new Error("Connect Timeout"))
    };
    const service = new MarketsService(prisma as never, client as never);

    await expect(service.syncActiveMarkets({ role: "ADMIN" })).resolves.toEqual({
      synced: 0,
      failed: 1,
      error: "Connect Timeout"
    });
    expect(prisma.marketSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("lists normalized market snapshots", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.findMany.mockResolvedValue([
      {
        id: "snapshot_1",
        marketId: "market_1",
        slug: "btc-100k",
        question: "Will BTC close above $100k this week?",
        category: "Crypto",
        active: true,
        closed: false,
        outcomes: ["Yes", "No"],
        outcomePrices: ["0.52", "0.48"],
        volume: "12345.67",
        liquidity: "890.12",
        syncedAt: new Date("2026-06-23T00:00:00.000Z")
      }
    ]);
    const service = new MarketsService(prisma as never, createClient([]) as never);

    await expect(service.listMarkets()).resolves.toEqual([
      {
        id: "snapshot_1",
        marketId: "market_1",
        slug: "btc-100k",
        question: "Will BTC close above $100k this week?",
        category: "Crypto",
        active: true,
        closed: false,
        outcomes: ["Yes", "No"],
        outcomePrices: ["0.52", "0.48"],
        volume: "12345.67",
        liquidity: "890.12",
        syncedAt: new Date("2026-06-23T00:00:00.000Z")
      }
    ]);
    expect(prisma.marketSnapshot.findMany).toHaveBeenCalledWith({
      orderBy: [{ syncedAt: "desc" }, { volume: "desc" }],
      take: 50
    });
  });
});
