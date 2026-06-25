import { ForbiddenException, Injectable } from "@nestjs/common";
import { OrderRouterConfigService, type OrderRouterEnvironment } from "../order-router/order-router.config";
import { PrismaService } from "../prisma/prisma.service";

interface Operator {
  role: "USER" | "ADMIN";
}

export type AdminGateStatus = "READY" | "PENDING" | "BLOCKED";

export interface AdminSummary {
  registeredUsers: number;
  adminUsers: number;
  walletsConnected: number;
  marketsSynced: number;
  latestMarketSyncedAt: Date | null;
  marketQuotesSynced: number;
  latestMarketQuoteSyncedAt: Date | null;
  ordersPreviewed: number;
  openRiskEvents: number;
}

export interface AdminGate {
  key: string;
  title: string;
  owner: string;
  status: AdminGateStatus;
  updatedAt: Date | null;
  details?: string | null;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRouterConfig: OrderRouterConfigService
  ) {}

  async getSummary(operator: Operator): Promise<AdminSummary> {
    this.requireAdmin(operator);

    const [
      registeredUsers,
      adminUsers,
      walletsConnected,
      marketsSynced,
      marketQuotesSynced,
      latestMarket,
      latestMarketQuote,
      ordersPreviewed,
      openRiskEvents
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: "ADMIN" } }),
      this.prisma.wallet.count({ where: { type: "EOA" } }),
      this.prisma.marketSnapshot.count(),
      this.prisma.marketQuoteSnapshot.count(),
      this.prisma.marketSnapshot.findFirst({
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true }
      }),
      this.prisma.marketQuoteSnapshot.findFirst({
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true }
      }),
      this.prisma.order.count({ where: { status: "PREVIEWED" } }),
      this.prisma.rateLimitEvent.count()
    ]);

    return {
      registeredUsers,
      adminUsers,
      walletsConnected,
      marketsSynced,
      latestMarketSyncedAt: latestMarket?.syncedAt ?? null,
      marketQuotesSynced,
      latestMarketQuoteSyncedAt: latestMarketQuote?.syncedAt ?? null,
      ordersPreviewed,
      openRiskEvents
    };
  }

  async getGates(operator: Operator): Promise<AdminGate[]> {
    this.requireAdmin(operator);

    const [
      marketsSynced,
      marketQuotesSynced,
      eoaWallets,
      depositWallets,
      latestMarket,
      latestQuote,
      latestEoaWallet,
      latestDepositWallet,
      latestRelayerFailure,
      latestOrder
    ] = await Promise.all([
      this.prisma.marketSnapshot.count(),
      this.prisma.marketQuoteSnapshot.count(),
      this.prisma.wallet.count({ where: { type: "EOA" } }),
      this.prisma.depositWallet.count({ where: { status: "READY" } }),
      this.prisma.marketSnapshot.findFirst({
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true }
      }),
      this.prisma.marketQuoteSnapshot.findFirst({
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true }
      }),
      this.prisma.wallet.findFirst({
        where: { type: "EOA" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      }),
      this.prisma.depositWallet.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      }),
      this.prisma.relayerTransaction.findFirst({
        orderBy: { updatedAt: "desc" },
        select: {
          failureReason: true,
          relayerTransactionId: true,
          status: true,
          updatedAt: true
        },
        where: {
          status: "FAILED"
        }
      }),
      this.prisma.order.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      })
    ]);

    return [
      {
        key: "market-data-sync",
        title: "Market data sync",
        owner: "Engineering",
        status: marketsSynced > 0 ? "READY" : "PENDING",
        updatedAt: latestMarket?.syncedAt ?? null
      },
      {
        key: "market-quote-sync",
        title: "Market quote sync",
        owner: "Engineering",
        status: marketQuotesSynced > 0 ? "READY" : "PENDING",
        updatedAt: latestQuote?.syncedAt ?? null
      },
      {
        key: "wallet-binding-proof",
        title: "Wallet binding proof",
        owner: "Product",
        status: eoaWallets > 0 ? "READY" : "PENDING",
        updatedAt: latestEoaWallet?.updatedAt ?? null
      },
      {
        key: "deposit-wallet-readiness",
        title: "Deposit Wallet readiness",
        owner: "Compliance",
        status: depositWallets > 0 ? "READY" : latestRelayerFailure ? "BLOCKED" : "PENDING",
        updatedAt: latestRelayerFailure?.updatedAt ?? latestDepositWallet?.updatedAt ?? null,
        ...(latestRelayerFailure?.failureReason ? { details: latestRelayerFailure.failureReason } : {})
      },
      {
        key: "real-order-confirmation",
        title: "Real order confirmation",
        owner: "Risk",
        status: "BLOCKED",
        updatedAt: latestOrder?.updatedAt ?? null
      }
    ];
  }

  getEnvironment(operator: Operator): OrderRouterEnvironment {
    this.requireAdmin(operator);

    return this.orderRouterConfig.getEnvironment();
  }

  private requireAdmin(operator: Operator) {
    if (operator.role !== "ADMIN") {
      throw new ForbiddenException("Admin role is required");
    }
  }
}
