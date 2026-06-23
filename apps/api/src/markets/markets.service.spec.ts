import { ForbiddenException } from "@nestjs/common";
import { MarketsService, type PolymarketMarketSource } from "./markets.service";

describe("MarketsService", () => {
  const createPrisma = () => ({
    marketSnapshot: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn()
    },
    marketQuoteSnapshot: {
      upsert: jest.fn()
    }
  });

  const createClient = (
    items: PolymarketMarketSource[],
    books: unknown[] = []
  ) => ({
    fetchActiveMarkets: jest.fn().mockResolvedValue(items),
    fetchOrderBooks: jest.fn().mockResolvedValue(books)
  });

  it("syncs open Polymarket markets and CLOB quote snapshots", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.upsert.mockResolvedValue({
      id: "snapshot_1",
      marketId: "market_1"
    });
    prisma.marketQuoteSnapshot.upsert.mockResolvedValue({});
    const client = createClient(
      [
        {
          id: "market_1",
          conditionId: "condition_1",
          slug: "btc-100k",
          question: "Will BTC close above $100k this week?",
          active: true,
          closed: false,
          enableOrderBook: true,
          clobTokenIds: '["token_yes","token_no"]',
          category: "Crypto",
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.52","0.48"]',
          volume: "12345.67",
          volume24hr: "234.56",
          liquidity: "890.12"
        },
        {
          id: "closed_market",
          question: "Closed market",
          active: true,
          closed: true,
          enableOrderBook: true,
          clobTokenIds: '["closed_yes","closed_no"]'
        }
      ],
      [
        {
          market: "condition_1",
          asset_id: "token_yes",
          hash: "hash_yes",
          bids: [{ price: "0.51", size: "100" }],
          asks: [{ price: "0.53", size: "80" }],
          min_order_size: "5",
          tick_size: "0.01"
        },
        {
          market: "condition_1",
          asset_id: "token_no",
          hash: "hash_no",
          bids: [{ price: "0.47", size: "100" }],
          asks: [{ price: "0.49", size: "80" }],
          min_order_size: "5",
          tick_size: "0.01"
        }
      ]
    );
    const service = new MarketsService(prisma as never, client as never);

    await expect(service.syncActiveMarkets({ role: "ADMIN" })).resolves.toEqual({
      synced: 1,
      failed: 0,
      quotesSynced: 2,
      quotesFailed: 0
    });
    expect(client.fetchActiveMarkets).toHaveBeenCalledWith(50);
    expect(client.fetchOrderBooks).toHaveBeenCalledWith(["token_yes", "token_no"]);
    expect(prisma.marketSnapshot.upsert).toHaveBeenCalledWith({
      where: { marketId: "market_1" },
      update: {
        active: true,
        category: "Crypto",
        clobTokenIds: ["token_yes", "token_no"],
        closed: false,
        conditionId: "condition_1",
        enableOrderBook: true,
        liquidity: "890.12",
        outcomePrices: ["0.52", "0.48"],
        outcomes: ["Yes", "No"],
        question: "Will BTC close above $100k this week?",
        raw: expect.objectContaining({ id: "market_1" }),
        slug: "btc-100k",
        syncedAt: expect.any(Date),
        volume: "12345.67",
        volume24hr: "234.56"
      },
      create: {
        active: true,
        category: "Crypto",
        clobTokenIds: ["token_yes", "token_no"],
        closed: false,
        conditionId: "condition_1",
        enableOrderBook: true,
        liquidity: "890.12",
        marketId: "market_1",
        outcomePrices: ["0.52", "0.48"],
        outcomes: ["Yes", "No"],
        question: "Will BTC close above $100k this week?",
        raw: expect.objectContaining({ id: "market_1" }),
        slug: "btc-100k",
        syncedAt: expect.any(Date),
        volume: "12345.67",
        volume24hr: "234.56"
      }
    });
    expect(prisma.marketQuoteSnapshot.upsert).toHaveBeenCalledWith({
      where: { tokenId: "token_yes" },
      update: expect.objectContaining({
        bestAsk: "0.53",
        bestBid: "0.51",
        midpoint: "0.52",
        spread: "0.02"
      }),
      create: expect.objectContaining({
        bestAsk: "0.53",
        bestBid: "0.51",
        marketSnapshotId: "snapshot_1",
        midpoint: "0.52",
        outcome: "Yes",
        outcomeIndex: 0,
        spread: "0.02",
        tokenId: "token_yes"
      })
    });
    expect(prisma.marketSnapshot.upsert).toHaveBeenCalledTimes(1);
  });

  it("reports quote failures without failing the market sync", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.upsert.mockResolvedValue({
      id: "snapshot_1",
      marketId: "market_1"
    });
    const client = createClient([
      {
        id: "market_1",
        question: "Will BTC close above $100k this week?",
        active: true,
        closed: false,
        enableOrderBook: true,
        clobTokenIds: '["token_yes","token_no"]',
        outcomes: '["Yes","No"]'
      }
    ]);
    client.fetchOrderBooks.mockRejectedValue(new Error("CLOB unavailable"));
    const service = new MarketsService(prisma as never, client as never);

    await expect(service.syncActiveMarkets({ role: "ADMIN" })).resolves.toEqual({
      synced: 1,
      failed: 0,
      quotesSynced: 0,
      quotesFailed: 2,
      error: "CLOB unavailable"
    });
    expect(prisma.marketQuoteSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("limits flattened Gamma markets and batches CLOB book requests", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.upsert.mockImplementation(({ create }) =>
      Promise.resolve({
        id: `snapshot_${create.marketId}`,
        marketId: create.marketId
      })
    );
    prisma.marketQuoteSnapshot.upsert.mockResolvedValue({});
    const markets = Array.from({ length: 55 }, (_, index) => ({
      id: `market_${index}`,
      question: `Market ${index}?`,
      active: true,
      closed: false,
      enableOrderBook: true,
      clobTokenIds: JSON.stringify([`token_${index}`]),
      outcomes: JSON.stringify(["Yes"])
    }));
    const client = createClient(
      markets,
      Array.from({ length: 50 }, (_, index) => ({
        asset_id: `token_${index}`,
        bids: [{ price: "0.40", size: "10" }],
        asks: [{ price: "0.60", size: "10" }]
      }))
    );
    client.fetchOrderBooks
      .mockResolvedValueOnce(
        Array.from({ length: 40 }, (_, index) => ({
          asset_id: `token_${index}`,
          bids: [{ price: "0.40", size: "10" }],
          asks: [{ price: "0.60", size: "10" }]
        }))
      )
      .mockResolvedValueOnce(
        Array.from({ length: 10 }, (_, index) => ({
          asset_id: `token_${index + 40}`,
          bids: [{ price: "0.40", size: "10" }],
          asks: [{ price: "0.60", size: "10" }]
        }))
      );
    const service = new MarketsService(prisma as never, client as never);

    await expect(service.syncActiveMarkets({ role: "ADMIN" })).resolves.toEqual({
      synced: 50,
      failed: 0,
      quotesSynced: 50,
      quotesFailed: 0
    });
    expect(prisma.marketSnapshot.upsert).toHaveBeenCalledTimes(50);
    expect(client.fetchOrderBooks).toHaveBeenNthCalledWith(
      1,
      Array.from({ length: 40 }, (_, index) => `token_${index}`)
    );
    expect(client.fetchOrderBooks).toHaveBeenNthCalledWith(
      2,
      Array.from({ length: 10 }, (_, index) => `token_${index + 40}`)
    );
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
      fetchActiveMarkets: jest.fn().mockRejectedValue(new Error("Connect Timeout")),
      fetchOrderBooks: jest.fn()
    };
    const service = new MarketsService(prisma as never, client as never);

    await expect(service.syncActiveMarkets({ role: "ADMIN" })).resolves.toEqual({
      synced: 0,
      failed: 1,
      quotesSynced: 0,
      quotesFailed: 0,
      error: "Connect Timeout"
    });
    expect(prisma.marketSnapshot.upsert).not.toHaveBeenCalled();
  });

  it("lists market snapshots with current CLOB quote fields", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.findMany.mockResolvedValue([
      {
        id: "snapshot_1",
        marketId: "market_1",
        conditionId: "condition_1",
        clobTokenIds: ["token_yes", "token_no"],
        enableOrderBook: true,
        slug: "btc-100k",
        question: "Will BTC close above $100k this week?",
        category: "Crypto",
        active: true,
        closed: false,
        outcomes: ["Yes", "No"],
        outcomePrices: ["0.52", "0.48"],
        volume: "12345.67",
        volume24hr: "234.56",
        liquidity: "890.12",
        syncedAt: new Date("2026-06-23T00:00:00.000Z"),
        quotes: [
          {
            outcome: "Yes",
            outcomeIndex: 0,
            tokenId: "token_yes",
            bestBid: "0.51",
            bestAsk: "0.53",
            midpoint: "0.52",
            spread: "0.02",
            minOrderSize: "5",
            tickSize: "0.01",
            syncedAt: new Date("2026-06-23T00:00:01.000Z")
          }
        ]
      }
    ]);
    const service = new MarketsService(prisma as never, createClient([]) as never);

    await expect(service.listMarkets()).resolves.toEqual([
      {
        id: "snapshot_1",
        marketId: "market_1",
        conditionId: "condition_1",
        clobTokenIds: ["token_yes", "token_no"],
        enableOrderBook: true,
        slug: "btc-100k",
        question: "Will BTC close above $100k this week?",
        category: "Crypto",
        active: true,
        closed: false,
        outcomes: ["Yes", "No"],
        outcomePrices: ["0.52", "0.48"],
        volume: "12345.67",
        volume24hr: "234.56",
        liquidity: "890.12",
        syncedAt: new Date("2026-06-23T00:00:00.000Z"),
        quotes: [
          {
            outcome: "Yes",
            outcomeIndex: 0,
            tokenId: "token_yes",
            bestBid: "0.51",
            bestAsk: "0.53",
            midpoint: "0.52",
            spread: "0.02",
            minOrderSize: "5",
            tickSize: "0.01",
            syncedAt: new Date("2026-06-23T00:00:01.000Z")
          }
        ]
      }
    ]);
    expect(prisma.marketSnapshot.findMany).toHaveBeenCalledWith({
      include: { quotes: { orderBy: { outcomeIndex: "asc" } } },
      orderBy: [{ syncedAt: "desc" }, { volume: "desc" }],
      take: 50
    });
  });

  it("gets a market snapshot by database id, market id, or slug", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.findFirst.mockResolvedValue({
      id: "snapshot_1",
      marketId: "market_1",
      conditionId: null,
      clobTokenIds: null,
      enableOrderBook: false,
      slug: "btc-100k",
      question: "Will BTC close above $100k this week?",
      category: "Crypto",
      active: true,
      closed: false,
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.52", "0.48"],
      volume: "12345.67",
      volume24hr: null,
      liquidity: "890.12",
      syncedAt: new Date("2026-06-23T00:00:00.000Z"),
      quotes: []
    });
    const service = new MarketsService(prisma as never, createClient([]) as never);

    await expect(service.getMarket("market_1")).resolves.toEqual({
      id: "snapshot_1",
      marketId: "market_1",
      conditionId: null,
      clobTokenIds: null,
      enableOrderBook: false,
      slug: "btc-100k",
      question: "Will BTC close above $100k this week?",
      category: "Crypto",
      active: true,
      closed: false,
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.52", "0.48"],
      volume: "12345.67",
      volume24hr: null,
      liquidity: "890.12",
      syncedAt: new Date("2026-06-23T00:00:00.000Z"),
      quotes: []
    });
    expect(prisma.marketSnapshot.findFirst).toHaveBeenCalledWith({
      include: { quotes: { orderBy: { outcomeIndex: "asc" } } },
      where: {
        OR: [{ id: "market_1" }, { marketId: "market_1" }, { slug: "market_1" }]
      }
    });
  });
});
