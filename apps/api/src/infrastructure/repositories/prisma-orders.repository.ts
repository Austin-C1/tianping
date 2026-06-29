import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreatePreviewOrderInput,
  OrderPreviewMarketRecord,
  OrdersRepository
} from "./repository.types";

@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPreviewMarket(marketId: string): Promise<OrderPreviewMarketRecord | null> {
    return this.prisma.marketSnapshot.findFirst({
      include: { quotes: { orderBy: { outcomeIndex: "asc" } } },
      where: {
        OR: [{ id: marketId }, { marketId }, { slug: marketId }]
      }
    }) as Promise<OrderPreviewMarketRecord | null>;
  }

  createPreviewOrder(input: CreatePreviewOrderInput): Promise<{ id: string }> {
    return this.prisma.order.create({
      data: input,
      select: { id: true }
    });
  }
}
