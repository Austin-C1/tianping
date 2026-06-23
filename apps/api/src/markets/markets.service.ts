import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PolymarketClient } from "./polymarket.client";

interface Operator {
  role: "USER" | "ADMIN";
}

export interface PolymarketMarketSource {
  id?: string | number;
  conditionId?: string;
  slug?: string | null;
  question?: string | null;
  active?: boolean;
  closed?: boolean;
  category?: string | null;
  outcomes?: unknown;
  outcomePrices?: unknown;
  volume?: string | number | null;
  liquidity?: string | number | null;
}

export interface MarketListItem {
  id: string;
  marketId: string;
  slug: string | null;
  question: string;
  category: string | null;
  active: boolean;
  closed: boolean;
  outcomes: unknown;
  outcomePrices: unknown;
  volume: string | null;
  liquidity: string | null;
  syncedAt: Date;
}

@Injectable()
export class MarketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly polymarketClient: PolymarketClient
  ) {}

  async syncActiveMarkets(operator: Operator) {
    if (operator.role !== "ADMIN") {
      throw new ForbiddenException("Admin role is required");
    }

    let markets: PolymarketMarketSource[];
    try {
      markets = await this.polymarketClient.fetchActiveMarkets(50);
    } catch (error) {
      return {
        synced: 0,
        failed: 1,
        error: error instanceof Error ? error.message : "Market sync failed"
      };
    }

    let synced = 0;
    let failed = 0;

    for (const market of markets) {
      try {
        const normalized = this.normalizeMarket(market);
        await this.prisma.marketSnapshot.upsert({
          where: { marketId: normalized.marketId },
          update: {
            active: normalized.active,
            category: normalized.category,
            closed: normalized.closed,
            liquidity: normalized.liquidity,
            outcomePrices: normalized.outcomePrices,
            outcomes: normalized.outcomes,
            question: normalized.question,
            raw: this.rawJson(market),
            slug: normalized.slug,
            syncedAt: normalized.syncedAt,
            volume: normalized.volume
          },
          create: {
            active: normalized.active,
            category: normalized.category,
            closed: normalized.closed,
            liquidity: normalized.liquidity,
            marketId: normalized.marketId,
            outcomePrices: normalized.outcomePrices,
            outcomes: normalized.outcomes,
            question: normalized.question,
            raw: this.rawJson(market),
            slug: normalized.slug,
            syncedAt: normalized.syncedAt,
            volume: normalized.volume
          }
        });
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    return { synced, failed };
  }

  async listMarkets(): Promise<MarketListItem[]> {
    const markets = await this.prisma.marketSnapshot.findMany({
      orderBy: [{ syncedAt: "desc" }, { volume: "desc" }],
      take: 50
    });

    return markets.map((market) => ({
      id: market.id,
      marketId: market.marketId,
      slug: market.slug,
      question: market.question,
      category: market.category,
      active: market.active,
      closed: market.closed,
      outcomes: market.outcomes,
      outcomePrices: market.outcomePrices,
      volume: market.volume?.toString() ?? null,
      liquidity: market.liquidity?.toString() ?? null,
      syncedAt: market.syncedAt
    }));
  }

  async getMarket(id: string): Promise<MarketListItem> {
    const market = await this.prisma.marketSnapshot.findUnique({
      where: { id }
    });

    if (!market) {
      throw new NotFoundException("Market not found");
    }

    return {
      id: market.id,
      marketId: market.marketId,
      slug: market.slug,
      question: market.question,
      category: market.category,
      active: market.active,
      closed: market.closed,
      outcomes: market.outcomes,
      outcomePrices: market.outcomePrices,
      volume: market.volume?.toString() ?? null,
      liquidity: market.liquidity?.toString() ?? null,
      syncedAt: market.syncedAt
    };
  }

  private normalizeMarket(market: PolymarketMarketSource) {
    const marketId = String(market.id ?? market.conditionId ?? "");
    if (!marketId || !market.question) {
      throw new Error("Market is missing id or question");
    }

    return {
      active: market.active ?? true,
      category: market.category ?? null,
      closed: market.closed ?? false,
      liquidity: this.decimalString(market.liquidity),
      marketId,
      outcomePrices: this.arrayValue(market.outcomePrices),
      outcomes: this.arrayValue(market.outcomes),
      question: market.question,
      slug: market.slug ?? null,
      syncedAt: new Date(),
      volume: this.decimalString(market.volume)
    };
  }

  private arrayValue(value: unknown) {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value !== "string") {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private decimalString(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return String(value);
  }

  private rawJson(market: PolymarketMarketSource): Prisma.InputJsonObject {
    return market as unknown as Prisma.InputJsonObject;
  }
}
