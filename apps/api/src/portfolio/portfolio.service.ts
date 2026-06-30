import { Inject, Injectable } from "@nestjs/common";
import { AuditLogService } from "../compliance/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";

interface Operator {
  userId: string;
  role?: "USER" | "ADMIN";
}

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AuditLogService)
    private readonly auditLogService: Pick<AuditLogService, "record"> = {
      record: async () => undefined
    }
  ) {}

  async getPortfolio(operator: Operator) {
    const [positions, trades] = await Promise.all([
      this.prisma.position.findMany({
        include: {
          marketSnapshot: {
            select: {
              marketId: true,
              question: true
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        where: { userId: operator.userId }
      }),
      this.prisma.trade.findMany({
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
        where: { userId: operator.userId }
      })
    ]);
    await this.auditLogService.record({
      action: "portfolio.read",
      metadata: {
        positionCount: positions.length,
        tradeCount: trades.length
      },
      userId: operator.userId
    });

    return {
      positions: positions.map((position) => ({
        averagePrice: position.averagePrice.toString(),
        id: position.id,
        market: position.marketSnapshot
          ? {
              marketId: position.marketSnapshot.marketId,
              question: position.marketSnapshot.question
            }
          : null,
        outcome: position.outcome,
        size: position.size.toString(),
        updatedAt: position.updatedAt
      })),
      summary: {
        positionCount: positions.length,
        tradeCount: trades.length
      },
      trades: trades.map((trade) => ({
        clobTradeId: trade.clobTradeId,
        executedAt: trade.executedAt,
        id: trade.id,
        market: trade.marketSnapshot
          ? {
              marketId: trade.marketSnapshot.marketId,
              question: trade.marketSnapshot.question
            }
          : null,
        orderId: trade.orderId,
        price: trade.price.toString(),
        side: trade.side,
        size: trade.size.toString()
      }))
    };
  }
}
