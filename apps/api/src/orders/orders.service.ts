import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WalletReadinessService } from "../wallets/wallet-readiness.service";
import type { PreviewOrderDto } from "./dto/preview-order.dto";
import { toClobOrderDraft } from "./order-domain";

interface Operator {
  userId: string;
}

const REAL_CLOB_DISABLED_REASON = "Real CLOB submission is disabled by the manual Gate";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly walletReadinessService: WalletReadinessService
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
}
