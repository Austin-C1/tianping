import { ForbiddenException, Injectable } from "@nestjs/common";
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
  marketQuotesSynced: number;
  ordersPreviewed: number;
  openRiskEvents: number;
}

export interface AdminGate {
  key: string;
  title: string;
  owner: string;
  status: AdminGateStatus;
  updatedAt: Date | null;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(operator: Operator): Promise<AdminSummary> {
    this.requireAdmin(operator);

    const [
      registeredUsers,
      adminUsers,
      walletsConnected,
      marketsSynced,
      marketQuotesSynced,
      ordersPreviewed,
      openRiskEvents
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: "ADMIN" } }),
      this.prisma.wallet.count({ where: { type: "EOA" } }),
      this.prisma.marketSnapshot.count(),
      this.prisma.marketQuoteSnapshot.count(),
      this.prisma.order.count({ where: { status: "PREVIEWED" } }),
      this.prisma.rateLimitEvent.count()
    ]);

    return {
      registeredUsers,
      adminUsers,
      walletsConnected,
      marketsSynced,
      marketQuotesSynced,
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
      latestOrder
    ] = await Promise.all([
      this.prisma.marketSnapshot.count(),
      this.prisma.marketQuoteSnapshot.count(),
      this.prisma.wallet.count({ where: { type: "EOA" } }),
      this.prisma.wallet.count({ where: { type: "DEPOSIT" } }),
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
      this.prisma.wallet.findFirst({
        where: { type: "DEPOSIT" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
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
        status: depositWallets > 0 ? "READY" : "PENDING",
        updatedAt: latestDepositWallet?.updatedAt ?? null
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

  private requireAdmin(operator: Operator) {
    if (operator.role !== "ADMIN") {
      throw new ForbiddenException("Admin role is required");
    }
  }
}
