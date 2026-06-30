import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreatePaperFillInput,
  CreatePreviewOrderInput,
  MarkOrderSubmittedInput,
  OrderItemRecord,
  OrderPreviewMarketRecord,
  OrderVisibilityInput,
  OrdersRepository,
  PaperSubmitOrderRecord,
  SaveSignedOrderInput,
  SignedPayloadOrderRecord,
  SigningIntentOrderRecord
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

  findOrderForSigningIntent(
    input: OrderVisibilityInput
  ): Promise<SigningIntentOrderRecord | null> {
    return this.prisma.order.findFirst({
      select: { id: true, rawPreview: true, status: true },
      where: this.orderVisibilityWhere(input)
    });
  }

  markSigningRequested(orderId: string): Promise<SigningIntentOrderRecord> {
    return this.prisma.order.update({
      data: {
        clobStatus: "SIGNING_REQUESTED",
        failureReason: null,
        status: "SIGNING_REQUESTED"
      },
      select: { id: true, rawPreview: true, status: true },
      where: { id: orderId }
    });
  }

  findOrderForSignedPayload(
    input: OrderVisibilityInput
  ): Promise<{ id: string; status: string } | null> {
    return this.prisma.order.findFirst({
      select: { id: true, status: true },
      where: this.orderVisibilityWhere(input)
    });
  }

  saveSignedOrder(input: SaveSignedOrderInput): Promise<SignedPayloadOrderRecord> {
    return this.prisma.order.update({
      data: {
        clobStatus: "SIGNED",
        failureReason: null,
        rawSignedOrder: input.signedPayload,
        signedPayload: input.signedPayload,
        status: "SIGNED"
      },
      select: { id: true, rawSignedOrder: true, status: true },
      where: { id: input.orderId }
    });
  }

  findOrderForSubmit(input: OrderVisibilityInput): Promise<PaperSubmitOrderRecord | null> {
    return this.prisma.order.findFirst({
      select: {
        id: true,
        marketSnapshotId: true,
        outcome: true,
        price: true,
        rawSignedOrder: true,
        side: true,
        size: true,
        status: true,
        userId: true
      },
      where: this.orderVisibilityWhere(input)
    }) as Promise<PaperSubmitOrderRecord | null>;
  }

  markOrderSubmitted(input: MarkOrderSubmittedInput): Promise<OrderItemRecord> {
    return this.prisma.order.update({
      data: {
        clobOrderId: input.clobOrderId,
        clobStatus: input.clobStatus,
        failureReason: null,
        signedPayload: this.inputJsonObject(input.raw),
        status: "SUBMITTED",
        submittedAt: input.submittedAt
      },
      select: this.orderSelect(),
      where: { id: input.orderId }
    }) as Promise<OrderItemRecord>;
  }

  async createPaperFill(input: CreatePaperFillInput): Promise<void> {
    const price = input.order.price.toString();
    const size = input.order.size.toString();

    await this.prisma.trade.create({
      data: {
        clobTradeId: `${input.clobOrderId}:fill`,
        executedAt: input.executedAt,
        marketSnapshotId: input.order.marketSnapshotId,
        orderId: input.order.id,
        price,
        raw: this.inputJsonObject(input.raw),
        side: input.order.side,
        size,
        userId: input.order.userId
      }
    });

    if (!input.order.marketSnapshotId || !input.order.outcome) {
      return;
    }

    await this.prisma.position.upsert({
      create: {
        averagePrice: price,
        marketSnapshotId: input.order.marketSnapshotId,
        outcome: input.order.outcome,
        size,
        userId: input.order.userId
      },
      update: {
        averagePrice: price,
        size: {
          increment: size
        }
      },
      where: {
        userId_marketSnapshotId_outcome: {
          marketSnapshotId: input.order.marketSnapshotId,
          outcome: input.order.outcome,
          userId: input.order.userId
        }
      }
    });
  }

  listOrders(operator: { role?: "USER" | "ADMIN"; userId: string }): Promise<OrderItemRecord[]> {
    return this.prisma.order.findMany({
      include: {
        marketSnapshot: {
          select: {
            marketId: true,
            question: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      where: operator.role === "ADMIN" ? {} : { userId: operator.userId }
    }) as Promise<OrderItemRecord[]>;
  }

  findOrderById(input: OrderVisibilityInput): Promise<OrderItemRecord | null> {
    return this.prisma.order.findFirst({
      include: {
        marketSnapshot: {
          select: {
            marketId: true,
            question: true
          }
        }
      },
      where: this.orderVisibilityWhere(input)
    }) as Promise<OrderItemRecord | null>;
  }

  private orderVisibilityWhere(input: OrderVisibilityInput) {
    return input.role === "ADMIN"
      ? { id: input.orderId }
      : { id: input.orderId, userId: input.userId };
  }

  private inputJsonObject(value: unknown): Prisma.InputJsonObject {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return value as Prisma.InputJsonObject;
    }

    return { value } as Prisma.InputJsonObject;
  }

  private orderSelect() {
    return {
      clobOrderId: true,
      createdAt: true,
      failureReason: true,
      id: true,
      marketSnapshot: {
        select: {
          marketId: true,
          question: true
        }
      },
      outcome: true,
      price: true,
      size: true,
      status: true,
      submittedAt: true,
      updatedAt: true
    } as const;
  }
}
