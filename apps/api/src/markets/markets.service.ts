import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { type ClobOrderBookSource, PolymarketClient } from "./polymarket.client";

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
  enableOrderBook?: boolean;
  clobTokenIds?: unknown;
  category?: string | null;
  outcomes?: unknown;
  outcomePrices?: unknown;
  volume?: string | number | null;
  volume24hr?: string | number | null;
  liquidity?: string | number | null;
}

export interface MarketQuoteItem {
  outcome: string;
  outcomeIndex: number;
  tokenId: string;
  bestBid: string | null;
  bestAsk: string | null;
  midpoint: string | null;
  spread: string | null;
  minOrderSize: string | null;
  negRisk: boolean;
  tickSize: string | null;
  syncedAt: Date;
}

export interface MarketListItem {
  id: string;
  marketId: string;
  conditionId: string | null;
  clobTokenIds: unknown;
  enableOrderBook: boolean;
  slug: string | null;
  question: string;
  category: string | null;
  active: boolean;
  closed: boolean;
  outcomes: unknown;
  outcomePrices: unknown;
  volume: string | null;
  volume24hr: string | null;
  liquidity: string | null;
  syncedAt: Date;
  quotes: MarketQuoteItem[];
}

interface NormalizedMarket {
  active: boolean;
  category: string | null;
  clobTokenIds: string[];
  closed: boolean;
  conditionId: string | null;
  enableOrderBook: boolean;
  liquidity: string | null;
  marketId: string;
  outcomePrices: string[];
  outcomes: string[];
  question: string;
  slug: string | null;
  syncedAt: Date;
  volume: string | null;
  volume24hr: string | null;
}

interface QuoteRequest {
  marketSnapshotId: string;
  outcome: string;
  outcomeIndex: number;
  tokenId: string;
}

const CLOB_BOOK_BATCH_SIZE = 40;

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
      markets = await this.polymarketClient.fetchActiveMarkets();
    } catch (error) {
      return {
        synced: 0,
        failed: 1,
        quotesSynced: 0,
        quotesFailed: 0,
        error: error instanceof Error ? error.message : "Market sync failed"
      };
    }

    let synced = 0;
    let failed = 0;
    let firstError: string | undefined;
    const quoteRequests: QuoteRequest[] = [];

    const syncableMarkets = markets.filter((market) => this.isSyncableMarket(market));

    for (const market of syncableMarkets) {
      try {
        const normalized = this.normalizeMarket(market);
        const snapshot = await this.prisma.marketSnapshot.upsert({
          where: { marketId: normalized.marketId },
          update: {
            active: normalized.active,
            category: normalized.category,
            clobTokenIds: normalized.clobTokenIds,
            closed: normalized.closed,
            conditionId: normalized.conditionId,
            enableOrderBook: normalized.enableOrderBook,
            liquidity: normalized.liquidity,
            outcomePrices: normalized.outcomePrices,
            outcomes: normalized.outcomes,
            question: normalized.question,
            raw: this.rawJson(market),
            slug: normalized.slug,
            syncedAt: normalized.syncedAt,
            volume: normalized.volume,
            volume24hr: normalized.volume24hr
          },
          create: {
            active: normalized.active,
            category: normalized.category,
            clobTokenIds: normalized.clobTokenIds,
            closed: normalized.closed,
            conditionId: normalized.conditionId,
            enableOrderBook: normalized.enableOrderBook,
            liquidity: normalized.liquidity,
            marketId: normalized.marketId,
            outcomePrices: normalized.outcomePrices,
            outcomes: normalized.outcomes,
            question: normalized.question,
            raw: this.rawJson(market),
            slug: normalized.slug,
            syncedAt: normalized.syncedAt,
            volume: normalized.volume,
            volume24hr: normalized.volume24hr
          }
        });

        normalized.clobTokenIds.forEach((tokenId, index) => {
          quoteRequests.push({
            marketSnapshotId: snapshot.id,
            outcome: normalized.outcomes[index] ?? `Outcome ${index + 1}`,
            outcomeIndex: index,
            tokenId
          });
        });
        synced += 1;
      } catch (error) {
        failed += 1;
        firstError ??= error instanceof Error ? error.message : "Market snapshot sync failed";
      }
    }

    const quoteResult = await this.syncQuoteSnapshots(quoteRequests);

    return {
      synced,
      failed,
      quotesSynced: quoteResult.synced,
      quotesFailed: quoteResult.failed,
      ...(firstError || quoteResult.error ? { error: firstError ?? quoteResult.error } : {})
    };
  }

  async listMarkets(): Promise<MarketListItem[]> {
    const markets = await this.prisma.marketSnapshot.findMany({
      include: { quotes: { orderBy: { outcomeIndex: "asc" } } },
      orderBy: [{ syncedAt: "desc" }, { volume: "desc" }]
    });

    return markets.map((market) => this.toListItem(market));
  }

  async getMarket(id: string): Promise<MarketListItem> {
    const market = await this.prisma.marketSnapshot.findFirst({
      include: { quotes: { orderBy: { outcomeIndex: "asc" } } },
      where: {
        OR: [{ id }, { marketId: id }, { slug: id }]
      }
    });

    if (!market) {
      throw new NotFoundException("Market not found");
    }

    return this.toListItem(market);
  }

  private async syncQuoteSnapshots(quoteRequests: QuoteRequest[]) {
    if (quoteRequests.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;
    let firstError: string | undefined;

    for (const batch of this.chunk(quoteRequests, CLOB_BOOK_BATCH_SIZE)) {
      let books: ClobOrderBookSource[];
      try {
        books = await this.polymarketClient.fetchOrderBooks(batch.map((quote) => quote.tokenId));
      } catch (error) {
        failed += batch.length;
        firstError ??= error instanceof Error ? error.message : "CLOB quote sync failed";
        continue;
      }

      const booksByToken = new Map(books.map((book) => [book.asset_id, book]));
      const result = await this.upsertQuoteBatch(batch, booksByToken);
      synced += result.synced;
      failed += result.failed;
      firstError ??= result.error;
    }

    return { synced, failed, ...(firstError ? { error: firstError } : {}) };
  }

  private async upsertQuoteBatch(
    quoteRequests: QuoteRequest[],
    booksByToken: Map<string, ClobOrderBookSource>
  ) {
    let synced = 0;
    let failed = 0;
    let firstError: string | undefined;

    for (const quoteRequest of quoteRequests) {
      const book = booksByToken.get(quoteRequest.tokenId);
      if (!book) {
        failed += 1;
        firstError ??= `Missing CLOB order book for token ${quoteRequest.tokenId}`;
        continue;
      }

      try {
        const normalized = this.normalizeOrderBook(book);
        const syncedAt = new Date();
        await this.prisma.marketQuoteSnapshot.upsert({
          where: { tokenId: quoteRequest.tokenId },
          update: {
            bestAsk: normalized.bestAsk,
            bestBid: normalized.bestBid,
            marketSnapshotId: quoteRequest.marketSnapshotId,
            midpoint: normalized.midpoint,
            minOrderSize: normalized.minOrderSize,
            negRisk: normalized.negRisk,
            orderBookHash: book.hash ?? null,
            outcome: quoteRequest.outcome,
            outcomeIndex: quoteRequest.outcomeIndex,
            raw: this.rawJson(book),
            spread: normalized.spread,
            syncedAt,
            tickSize: normalized.tickSize
          },
          create: {
            bestAsk: normalized.bestAsk,
            bestBid: normalized.bestBid,
            marketSnapshotId: quoteRequest.marketSnapshotId,
            midpoint: normalized.midpoint,
            minOrderSize: normalized.minOrderSize,
            negRisk: normalized.negRisk,
            orderBookHash: book.hash ?? null,
            outcome: quoteRequest.outcome,
            outcomeIndex: quoteRequest.outcomeIndex,
            raw: this.rawJson(book),
            spread: normalized.spread,
            syncedAt,
            tickSize: normalized.tickSize,
            tokenId: quoteRequest.tokenId
          }
        });
        synced += 1;
      } catch (error) {
        failed += 1;
        firstError ??= error instanceof Error ? error.message : "CLOB quote snapshot sync failed";
      }
    }

    return { synced, failed, ...(firstError ? { error: firstError } : {}) };
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }

  private normalizeMarket(market: PolymarketMarketSource): NormalizedMarket {
    const marketId = String(market.id ?? market.conditionId ?? "");
    if (!marketId || !market.question) {
      throw new Error("Market is missing id or question");
    }

    return {
      active: market.active ?? true,
      category: market.category ?? null,
      clobTokenIds: this.arrayValue(market.clobTokenIds),
      closed: market.closed ?? false,
      conditionId: market.conditionId ?? null,
      enableOrderBook: market.enableOrderBook ?? false,
      liquidity: this.decimalString(market.liquidity),
      marketId,
      outcomePrices: this.arrayValue(market.outcomePrices),
      outcomes: this.arrayValue(market.outcomes),
      question: market.question,
      slug: market.slug ?? null,
      syncedAt: new Date(),
      volume: this.decimalString(market.volume),
      volume24hr: this.decimalString(market.volume24hr)
    };
  }

  private normalizeOrderBook(book: ClobOrderBookSource) {
    const bestBid = this.bestBid(book.bids ?? []);
    const bestAsk = this.bestAsk(book.asks ?? []);
    const midpoint = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;
    const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;

    return {
      bestAsk: this.decimalNumberString(bestAsk),
      bestBid: this.decimalNumberString(bestBid),
      midpoint: this.decimalNumberString(midpoint),
      minOrderSize: this.decimalString(book.min_order_size),
      negRisk: book.neg_risk ?? false,
      spread: this.decimalNumberString(spread),
      tickSize: this.decimalString(book.tick_size)
    };
  }

  private toListItem(market: {
    id: string;
    marketId: string;
    conditionId: string | null;
    clobTokenIds: Prisma.JsonValue | null;
    enableOrderBook: boolean;
    slug: string | null;
    question: string;
    category: string | null;
    active: boolean;
    closed: boolean;
    outcomes: Prisma.JsonValue | null;
    outcomePrices: Prisma.JsonValue | null;
    volume: { toString(): string } | string | null;
    volume24hr: { toString(): string } | string | null;
    liquidity: { toString(): string } | string | null;
    syncedAt: Date;
    quotes: Array<{
      outcome: string;
      outcomeIndex: number;
      tokenId: string;
      bestBid: { toString(): string } | string | null;
      bestAsk: { toString(): string } | string | null;
      midpoint: { toString(): string } | string | null;
      spread: { toString(): string } | string | null;
      minOrderSize: { toString(): string } | string | null;
      negRisk: boolean;
      tickSize: { toString(): string } | string | null;
      syncedAt: Date;
    }>;
  }): MarketListItem {
    return {
      id: market.id,
      marketId: market.marketId,
      conditionId: market.conditionId,
      clobTokenIds: market.clobTokenIds,
      enableOrderBook: market.enableOrderBook,
      slug: market.slug,
      question: market.question,
      category: market.category,
      active: market.active,
      closed: market.closed,
      outcomes: market.outcomes,
      outcomePrices: market.outcomePrices,
      volume: this.optionalString(market.volume),
      volume24hr: this.optionalString(market.volume24hr),
      liquidity: this.optionalString(market.liquidity),
      syncedAt: market.syncedAt,
      quotes: market.quotes.map((quote) => ({
        outcome: quote.outcome,
        outcomeIndex: quote.outcomeIndex,
        tokenId: quote.tokenId,
        bestBid: this.optionalString(quote.bestBid),
        bestAsk: this.optionalString(quote.bestAsk),
        midpoint: this.optionalString(quote.midpoint),
        spread: this.optionalString(quote.spread),
        minOrderSize: this.optionalString(quote.minOrderSize),
        negRisk: quote.negRisk,
        tickSize: this.optionalString(quote.tickSize),
        syncedAt: quote.syncedAt
      }))
    };
  }

  private isSyncableMarket(market: PolymarketMarketSource) {
    return (
      market.active !== false &&
      market.closed !== true &&
      market.enableOrderBook === true &&
      this.arrayValue(market.clobTokenIds).length > 0
    );
  }

  private arrayValue(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(String);
    }

    if (typeof value !== "string") {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  private bestBid(levels: { price: string }[]) {
    return this.bestPrice(levels, Math.max);
  }

  private bestAsk(levels: { price: string }[]) {
    return this.bestPrice(levels, Math.min);
  }

  private bestPrice(levels: { price: string }[], select: (...values: number[]) => number) {
    const prices = levels
      .map((level) => Number(level.price))
      .filter((price) => Number.isFinite(price));

    return prices.length > 0 ? select(...prices) : null;
  }

  private decimalNumberString(value: number | null) {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    return Number(value.toFixed(8)).toString();
  }

  private decimalString(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return String(value);
  }

  private optionalString(value: { toString(): string } | string | null) {
    return value?.toString() ?? null;
  }

  private rawJson(value: unknown): Prisma.InputJsonObject {
    return value as Prisma.InputJsonObject;
  }
}
