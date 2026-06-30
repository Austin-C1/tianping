import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { AuditLogService } from "../compliance/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletReadinessService } from "../wallets/wallet-readiness.service";
import type { OrderIdDto, SaveSignedOrderDto } from "./dto/order-lifecycle.dto";
import type { PreviewOrderDto } from "./dto/preview-order.dto";
import { toClobOrderDraft } from "./order-domain";
import { PaperOrderProvider } from "./paper-order-provider";

interface Operator {
  userId: string;
  role?: "USER" | "ADMIN";
}

const REAL_CLOB_DISABLED_REASON = "Real CLOB submission is disabled by the manual Gate";
const SENSITIVE_KEYS = new Set(["privatekey", "private_key", "mnemonic", "seed", "secret"]);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly walletReadinessService: WalletReadinessService,
    private readonly paperOrderProvider: PaperOrderProvider = new PaperOrderProvider(),
    @Inject(AuditLogService)
    private readonly auditLogService: Pick<AuditLogService, "record"> = {
      record: async () => undefined
    }
  ) {}

  async previewOrder(dto: PreviewOrderDto, operator: Operator) {
    const amountUsd = this.normalizeMoney(dto.amountUsd);
    if (amountUsd <= 0) {
      throw new BadRequestException("Order amount must be greater than zero");
    }

    const market = await this.prisma.marketSnapshot.findFirst({
      include: { quotes: { orderBy: { outcomeIndex: "asc" } } },
      where: {
        OR: [{ id: dto.marketId }, { marketId: dto.marketId }, { slug: dto.marketId }]
      }
    });

    if (!market) {
      throw new NotFoundException("Market not found");
    }

    if (!market.active || market.closed) {
      throw new BadRequestException("Market is not open for order previews");
    }

    const quote = market.quotes.find((item) => item.outcomeIndex === dto.outcomeIndex);
    if (!quote) {
      throw new BadRequestException("Outcome quote is not available");
    }

    const tokenID = quote.tokenId;
    if (!tokenID) {
      throw new BadRequestException("Outcome quote token is not available");
    }

    const price = this.priceValue(quote.bestAsk ?? quote.midpoint);
    if (price <= 0 || price > 1) {
      throw new BadRequestException("Outcome quote price is not valid");
    }

    const minOrderSize = this.optionalNumber(quote.minOrderSize);
    if (minOrderSize !== null && amountUsd < minOrderSize) {
      throw new BadRequestException("Order amount is below the CLOB minimum order size");
    }

    const orderType = dto.orderType === "FOK" ? "FOK" : "FAK";
    const builderCode = this.builderCode();
    const funderAddress = this.funderAddress();
    const shares = this.normalizeMoney(amountUsd / price);
    const estimatedPayout = shares;
    const estimatedProfit = this.normalizeMoney(estimatedPayout - amountUsd);
    const outcome = this.outcomeValue(market.outcomes, dto.outcomeIndex) ?? quote.outcome;
    const clobDraft = toClobOrderDraft({
      amountUsd,
      builderCode,
      funderAddress,
      negRisk: quote.negRisk,
      orderType,
      side: "BUY",
      tickSize: quote.tickSize?.toString() ?? "0.01",
      tokenID
    });
    const readiness = await this.walletReadinessService.getReadiness(operator, {
      minimumOrderSize: minOrderSize ?? undefined,
      requiredAmountUsd: amountUsd
    });

    const created = await this.prisma.order.create({
      data: {
        builderCode,
        clobStatus: "PREVIEWED",
        failureReason: null,
        funderAddress,
        marketSnapshotId: market.id,
        orderType,
        outcome,
        price: price.toString(),
        rawPreview: this.inputJson(clobDraft),
        rawSignedOrder: undefined,
        side: "BUY",
        signatureType: clobDraft.signatureType,
        size: shares.toString(),
        status: "PREVIEWED",
        tokenId: tokenID,
        userId: operator.userId
      },
      select: { id: true }
    });
    await this.auditLogService.record({
      action: "order.previewed",
      metadata: {
        amountUsd,
        marketId: market.marketId,
        orderId: created.id,
        outcome,
        price
      },
      userId: operator.userId
    });

    return {
      id: created.id,
      builderAttributionStatus: builderCode ? "CONFIGURED" : "MISSING",
      clob: clobDraft,
      costUsd: amountUsd,
      estimatedPayout,
      estimatedProfit,
      market: {
        conditionId: market.conditionId,
        marketId: market.marketId,
        question: market.question
      },
      outcome,
      price,
      readiness,
      shares,
      submitDisabled: true,
      submitDisabledReason: REAL_CLOB_DISABLED_REASON
    };
  }

  async createSigningIntent(dto: OrderIdDto, operator: Operator) {
    const order = await this.prisma.order.findFirst({
      select: { id: true, rawPreview: true, status: true },
      where: this.orderVisibilityWhere(dto.orderId, operator)
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.status !== "PREVIEWED") {
      throw new BadRequestException("Only previewed orders can create a signing intent");
    }

    if (!order.rawPreview) {
      throw new BadRequestException("Order preview payload is missing");
    }

    const updated = await this.prisma.order.update({
      data: {
        clobStatus: "SIGNING_REQUESTED",
        failureReason: null,
        status: "SIGNING_REQUESTED"
      },
      select: { id: true, rawPreview: true, status: true },
      where: { id: order.id }
    });
    await this.recordOrderAudit("order.signing_requested", updated.id, operator.userId);

    return {
      id: updated.id,
      signingPayload: updated.rawPreview,
      status: updated.status
    };
  }

  private async recordOrderAudit(action: string, orderId: string, userId: string) {
    await this.auditLogService.record({
      action,
      metadata: {
        orderId
      },
      userId
    });
  }

  async saveSignedOrder(dto: SaveSignedOrderDto, operator: Operator) {
    const order = await this.prisma.order.findFirst({
      select: { id: true, status: true },
      where: this.orderVisibilityWhere(dto.orderId, operator)
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.status !== "SIGNING_REQUESTED") {
      throw new BadRequestException("Only signing-requested orders can be signed");
    }

    const signedPayload = this.sanitizePayload(dto.signedPayload);
    const updated = await this.prisma.order.update({
      data: {
        clobStatus: "SIGNED",
        failureReason: null,
        rawSignedOrder: signedPayload,
        signedPayload,
        status: "SIGNED"
      },
      select: { id: true, rawSignedOrder: true, status: true },
      where: { id: order.id }
    });
    await this.recordOrderAudit("order.signed", updated.id, operator.userId);

    return {
      id: updated.id,
      signedPayload: updated.rawSignedOrder,
      status: updated.status
    };
  }

  async submitOrder(dto: OrderIdDto, operator: Operator) {
    const order = await this.prisma.order.findFirst({
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
      where: this.orderVisibilityWhere(dto.orderId, operator)
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.status !== "SIGNED") {
      throw new BadRequestException("Only signed orders can be submitted");
    }

    if (!order.rawSignedOrder) {
      throw new BadRequestException("Signed order payload is missing");
    }

    const mode = this.orderRouterMode();
    if (mode === "preview") {
      throw new BadRequestException("Order submit is disabled in preview mode");
    }

    if (mode === "live") {
      throw new BadRequestException("Live CLOB submit is not implemented in this module");
    }

    const submitted = await this.paperOrderProvider.submit({
      orderId: order.id,
      signedPayload: order.rawSignedOrder
    });
    const submittedAt = new Date();

    const updated = await this.prisma.order.update({
      data: {
        clobOrderId: submitted.clobOrderId,
        clobStatus: submitted.status,
        failureReason: null,
        signedPayload: this.inputJsonObject(submitted.raw),
        status: "SUBMITTED",
        submittedAt
      },
      select: this.orderSelect(),
      where: { id: order.id }
    });
    await this.createPaperFill(order, submitted.clobOrderId, submitted.raw, submittedAt);
    await this.auditLogService.record({
      action: "order.submitted",
      metadata: {
        clobOrderId: submitted.clobOrderId,
        mode,
        orderId: order.id
      },
      userId: order.userId
    });

    return this.toOrderItem(updated);
  }

  async listOrders(operator: Operator) {
    const orders = await this.prisma.order.findMany({
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
    });

    return orders.map((order) => this.toOrderItem(order));
  }

  async getOrder(id: string, operator: Operator) {
    const order = await this.prisma.order.findFirst({
      include: {
        marketSnapshot: {
          select: {
            marketId: true,
            question: true
          }
        }
      },
      where: this.orderVisibilityWhere(id, operator)
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return this.toOrderItem(order);
  }

  private builderCode(): string | null {
    const value = this.config.get<string>("POLYMARKET_BUILDER_CODE")?.trim();

    return value && /^0x[a-fA-F0-9]{64}$/.test(value) ? value : null;
  }

  private funderAddress(): string | null {
    const value = this.config.get<string>("POLYMARKET_FUNDER_ADDRESS")?.trim();

    return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value : null;
  }

  private normalizeMoney(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.round(value * 100) / 100;
  }

  private outcomeValue(value: Prisma.JsonValue | null, index: number): string | null {
    if (!Array.isArray(value)) {
      return null;
    }

    const outcome = value[index];

    return typeof outcome === "string" ? outcome : null;
  }

  private priceValue(value: { toString(): string } | string | null): number {
    const numeric = Number(value?.toString() ?? "");

    return Number.isFinite(numeric) ? numeric : 0;
  }

  private optionalNumber(value: { toString(): string } | string | null): number | null {
    if (value === null) {
      return null;
    }

    const numeric = Number(value.toString());

    return Number.isFinite(numeric) ? numeric : null;
  }

  private inputJson(value: object): Prisma.InputJsonObject {
    return value as unknown as Prisma.InputJsonObject;
  }

  private inputJsonObject(value: unknown): Prisma.InputJsonObject {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return value as Prisma.InputJsonObject;
    }

    return { value } as Prisma.InputJsonObject;
  }

  private orderRouterMode(): "preview" | "paper" | "live" {
    const value = this.config.get<string>("ORDER_ROUTER_MODE", "preview");

    return value === "paper" || value === "live" ? value : "preview";
  }

  private orderVisibilityWhere(id: string, operator: Operator) {
    return operator.role === "ADMIN" ? { id } : { id, userId: operator.userId };
  }

  private async createPaperFill(
    order: {
      id: string;
      marketSnapshotId: string | null;
      outcome: string | null;
      price: { toString(): string } | string;
      side: "BUY" | "SELL";
      size: { toString(): string } | string;
      userId: string;
    },
    clobOrderId: string,
    raw: Record<string, unknown>,
    executedAt: Date
  ) {
    const price = order.price.toString();
    const size = order.size.toString();

    await this.prisma.trade.create({
      data: {
        clobTradeId: `${clobOrderId}:fill`,
        executedAt,
        marketSnapshotId: order.marketSnapshotId,
        orderId: order.id,
        price,
        raw: this.inputJsonObject(raw),
        side: order.side,
        size,
        userId: order.userId
      }
    });

    if (!order.marketSnapshotId || !order.outcome) {
      return;
    }

    await this.prisma.position.upsert({
      create: {
        averagePrice: price,
        marketSnapshotId: order.marketSnapshotId,
        outcome: order.outcome,
        size,
        userId: order.userId
      },
      update: {
        averagePrice: price,
        size: {
          increment: size
        }
      },
      where: {
        userId_marketSnapshotId_outcome: {
          marketSnapshotId: order.marketSnapshotId,
          outcome: order.outcome,
          userId: order.userId
        }
      }
    });
  }

  private sanitizePayload(value: unknown): Prisma.InputJsonObject {
    const sanitized = this.sanitizeValue(value);

    return this.inputJsonObject(sanitized);
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value === null || typeof value !== "object") {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase()))
        .map(([key, item]) => [key, this.sanitizeValue(item)])
    );
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

  private toOrderItem(order: {
    clobOrderId: string | null;
    createdAt: Date;
    failureReason: string | null;
    id: string;
    marketSnapshot?: { marketId: string; question: string } | null;
    outcome: string | null;
    price: { toString(): string } | string;
    size: { toString(): string } | string;
    status: string;
    submittedAt: Date | null;
    updatedAt: Date;
  }) {
    return {
      clobOrderId: order.clobOrderId,
      createdAt: order.createdAt,
      failureReason: order.failureReason,
      id: order.id,
      market: order.marketSnapshot
        ? {
            marketId: order.marketSnapshot.marketId,
            question: order.marketSnapshot.question
          }
        : null,
      outcome: order.outcome,
      price: order.price.toString(),
      size: order.size.toString(),
      status: order.status,
      submittedAt: order.submittedAt,
      updatedAt: order.updatedAt
    };
  }
}
