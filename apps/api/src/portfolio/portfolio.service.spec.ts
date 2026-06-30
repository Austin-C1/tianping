import { PortfolioService } from "./portfolio.service";

describe("PortfolioService", () => {
  const createPrisma = () => ({
    position: {
      findMany: jest.fn()
    },
    trade: {
      findMany: jest.fn()
    }
  });
  const createAuditLogService = () => ({
    record: jest.fn().mockResolvedValue(undefined)
  });

  it("loads positions and trades for the current user only", async () => {
    const prisma = createPrisma();
    const auditLogService = createAuditLogService();
    prisma.position.findMany.mockResolvedValue([
      {
        averagePrice: { toString: () => "0.5" },
        id: "position_1",
        marketSnapshot: {
          marketId: "market_1",
          question: "Question?"
        },
        outcome: "Yes",
        size: { toString: () => "20" },
        updatedAt: new Date("2026-06-30T00:00:00.000Z")
      }
    ]);
    prisma.trade.findMany.mockResolvedValue([
      {
        clobTradeId: "paper_order_1:fill",
        executedAt: new Date("2026-06-30T00:01:00.000Z"),
        id: "trade_1",
        marketSnapshot: {
          marketId: "market_1",
          question: "Question?"
        },
        orderId: "order_1",
        price: { toString: () => "0.5" },
        side: "BUY",
        size: { toString: () => "20" }
      }
    ]);
    const service = new PortfolioService(prisma as never, auditLogService as never);

    await expect(service.getPortfolio({ userId: "user_1", role: "USER" })).resolves.toEqual({
      positions: [
        {
          averagePrice: "0.5",
          id: "position_1",
          market: {
            marketId: "market_1",
            question: "Question?"
          },
          outcome: "Yes",
          size: "20",
          updatedAt: new Date("2026-06-30T00:00:00.000Z")
        }
      ],
      summary: {
        positionCount: 1,
        tradeCount: 1
      },
      trades: [
        {
          clobTradeId: "paper_order_1:fill",
          executedAt: new Date("2026-06-30T00:01:00.000Z"),
          id: "trade_1",
          market: {
            marketId: "market_1",
            question: "Question?"
          },
          orderId: "order_1",
          price: "0.5",
          side: "BUY",
          size: "20"
        }
      ]
    });
    expect(prisma.position.findMany).toHaveBeenCalledWith({
      include: {
        marketSnapshot: {
          select: {
            marketId: true,
            question: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      where: { userId: "user_1" }
    });
    expect(prisma.trade.findMany).toHaveBeenCalledWith({
      include: {
        marketSnapshot: {
          select: {
            marketId: true,
            question: true
          }
        }
      },
      orderBy: { executedAt: "desc" },
      take: 25,
      where: { userId: "user_1" }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "portfolio.read",
      metadata: {
        positionCount: 1,
        tradeCount: 1
      },
      userId: "user_1"
    });
  });
});
