import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AuditLogService } from "../compliance/audit-log.service";
import { OrderRouterConfigService, type OrderRouterEnvironment } from "../order-router/order-router.config";
import { PrismaService } from "../prisma/prisma.service";
import { LiveApprovalReasonDto } from "./dto/live-approval.dto";

interface Operator {
  email?: string;
  role: "USER" | "ADMIN";
  userId?: string;
}

type DecimalLike = string | number | { toString(): string };

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

export type AdminRiskGateCategory = "environment" | "market" | "wallet" | "compliance" | "risk";
export type AdminRiskGateSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AdminRiskGate {
  key: string;
  title: string;
  category: AdminRiskGateCategory;
  status: AdminGateStatus;
  severity: AdminRiskGateSeverity;
  blocking: boolean;
  description: string;
  evidence: string;
  updatedAt: Date | null;
}

export interface AdminRiskGateReport {
  generatedAt: Date;
  mode: OrderRouterEnvironment["mode"];
  liveTradingEnabled: boolean;
  canSubmitLiveOrders: boolean;
  blockingCount: number;
  warningCount: number;
  gates: AdminRiskGate[];
}

export type AdminLiveApprovalStatusValue = "APPROVED" | "NOT_APPROVED";
export type AdminLiveApprovalRecordStatus = "APPROVED" | "REVOKED";

export interface AdminLiveApprovalRecord {
  id: string;
  status: AdminLiveApprovalRecordStatus;
  approvalReason: string;
  approvedById: string | null;
  approvedByEmail: string | null;
  approvedAt: Date;
  revokeReason: string | null;
  revokedById: string | null;
  revokedByEmail: string | null;
  revokedAt: Date | null;
}

export interface AdminLiveApprovalStatus {
  status: AdminLiveApprovalStatusValue;
  latestApproval: AdminLiveApprovalRecord | null;
  safetyNotice: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

const FUNDING_CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_APPROVAL_SAFETY_NOTICE =
  "Manual approval records readiness only. It does not enable real CLOB submit.";
const QUEUE_SYNC_SAFETY_NOTICE =
  "This records readiness only and does not enable real CLOB submit.";
const liveApprovalInclude = {
  approvedBy: {
    select: { email: true }
  },
  revokedBy: {
    select: { email: true }
  }
} satisfies Prisma.LiveTradingApprovalInclude;

type LiveTradingApprovalWithUsers = Prisma.LiveTradingApprovalGetPayload<{
  include: typeof liveApprovalInclude;
}>;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRouterConfig: OrderRouterConfigService,
    @Inject(AuditLogService)
    private readonly auditLogService: Pick<AuditLogService, "record"> = {
      record: async () => undefined
    }
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

  async getAuditLogs(operator: Operator): Promise<AdminAuditLog[]> {
    this.requireAdmin(operator);

    const logs = await this.prisma.auditLog.findMany({
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return logs.map((log) => ({
      action: log.action,
      createdAt: log.createdAt,
      id: log.id,
      ipAddress: log.ipAddress,
      metadata: log.metadata,
      userAgent: log.userAgent,
      userEmail: log.user?.email ?? null,
      userId: log.userId
    }));
  }

  async getRiskGateReport(operator: Operator): Promise<AdminRiskGateReport> {
    this.requireAdmin(operator);

    const environment = this.orderRouterConfig.getEnvironment();
    const [
      marketsSynced,
      marketQuotesSynced,
      eoaWallets,
      depositWallets,
      openRiskEvents,
      latestMarket,
      latestQuote,
      latestEoaWallet,
      latestDepositWallet,
      latestFundingWallet,
      latestRelayerFailure,
      latestAuditLog,
      latestMarketSyncJob,
      activeLiveApproval
    ] = await Promise.all([
      this.prisma.marketSnapshot.count(),
      this.prisma.marketQuoteSnapshot.count(),
      this.prisma.wallet.count({ where: { type: "EOA" } }),
      this.prisma.depositWallet.count({ where: { status: "READY" } }),
      this.prisma.rateLimitEvent.count(),
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
      this.prisma.depositWallet.findFirst({
        orderBy: { updatedAt: "desc" },
        select: {
          balanceAllowanceUpdatedAt: true,
          exchangeAllowance: true,
          pUsdBalance: true,
          updatedAt: true
        },
        where: { status: "READY" }
      }),
      this.prisma.relayerTransaction.findFirst({
        orderBy: { updatedAt: "desc" },
        select: {
          failureReason: true,
          status: true,
          updatedAt: true
        },
        where: {
          status: "FAILED"
        }
      }),
      this.prisma.auditLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
      }),
      this.prisma.syncJobRun.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          completedAt: true,
          createdAt: true,
          failureReason: true,
          status: true,
          updatedAt: true
        },
        where: { type: "MARKET_SYNC" }
      }),
      this.findActiveLiveApproval()
    ]);

    const gates: AdminRiskGate[] = [
      {
        key: "order-router-safe-mode",
        title: "Order Router safe mode",
        category: "environment",
        status: environment.mode === "live" ? "BLOCKED" : "READY",
        severity: environment.mode === "live" ? "CRITICAL" : "INFO",
        blocking: true,
        description: "Real CLOB routing must stay disabled until manual approval exists.",
        evidence:
          environment.mode === "live"
            ? "ORDER_ROUTER_MODE=live would allow live routing when fully configured."
            : `ORDER_ROUTER_MODE=${environment.mode} keeps real CLOB submission disabled.`,
        updatedAt: null
      },
      {
        key: "market-data-sync",
        title: "Market data sync",
        category: "market",
        status: marketsSynced > 0 ? "READY" : "PENDING",
        severity: marketsSynced > 0 ? "INFO" : "WARNING",
        blocking: true,
        description: "Markets must be synced before any trading workflow is trusted.",
        evidence:
          marketsSynced > 0
            ? `${marketsSynced} market snapshot(s) are available.`
            : "No market snapshots are available.",
        updatedAt: latestMarket?.syncedAt ?? null
      },
      {
        key: "market-quote-sync",
        title: "Market quote sync",
        category: "market",
        status: marketQuotesSynced > 0 ? "READY" : "PENDING",
        severity: marketQuotesSynced > 0 ? "INFO" : "WARNING",
        blocking: true,
        description: "Quote snapshots must exist for order preview and sizing checks.",
        evidence:
          marketQuotesSynced > 0
            ? `${marketQuotesSynced} market quote snapshot(s) are available.`
            : "No market quote snapshots are available.",
        updatedAt: latestQuote?.syncedAt ?? null
      },
      {
        key: "wallet-binding-proof",
        title: "Wallet binding proof",
        category: "wallet",
        status: eoaWallets > 0 ? "READY" : "PENDING",
        severity: eoaWallets > 0 ? "INFO" : "WARNING",
        blocking: true,
        description: "At least one EOA wallet proof should exist before production readiness.",
        evidence:
          eoaWallets > 0 ? `${eoaWallets} EOA wallet(s) are linked.` : "No EOA wallet is linked.",
        updatedAt: latestEoaWallet?.updatedAt ?? null
      },
      this.depositWalletGate(depositWallets, latestDepositWallet?.updatedAt ?? null, latestRelayerFailure),
      {
        key: "audit-trail",
        title: "Audit trail",
        category: "compliance",
        status: latestAuditLog ? "READY" : "PENDING",
        severity: latestAuditLog ? "INFO" : "WARNING",
        blocking: true,
        description: "Audit records must exist before higher-risk workflows are reviewed.",
        evidence: latestAuditLog ? "Latest audit log exists." : "No audit logs found.",
        updatedAt: latestAuditLog?.createdAt ?? null
      },
      this.fundingReadinessGate(latestFundingWallet),
      this.queueSyncReadinessGate(latestMarketSyncJob),
      {
        key: "risk-event-review",
        title: "Risk event review",
        category: "risk",
        status: openRiskEvents > 0 ? "PENDING" : "READY",
        severity: openRiskEvents > 0 ? "WARNING" : "INFO",
        blocking: false,
        description: "Rate-limit and abuse signals should be reviewed by an operator.",
        evidence:
          openRiskEvents > 0
            ? `${openRiskEvents} rate-limit event(s) require review.`
            : "No rate-limit events are open.",
        updatedAt: null
      },
      this.manualLiveApprovalGate(activeLiveApproval)
    ];
    const blockingCount = gates.filter((gate) => gate.blocking && gate.status !== "READY").length;
    const warningCount = gates.filter((gate) => !gate.blocking && gate.status !== "READY").length;

    return {
      blockingCount,
      canSubmitLiveOrders: environment.liveTradingEnabled && blockingCount === 0,
      generatedAt: new Date(),
      gates,
      liveTradingEnabled: environment.liveTradingEnabled,
      mode: environment.mode,
      warningCount
    };
  }

  async getLiveApproval(operator: Operator): Promise<AdminLiveApprovalStatus> {
    this.requireAdmin(operator);

    return this.buildLiveApprovalStatus();
  }

  async approveLiveTrading(
    operator: Operator,
    dto: LiveApprovalReasonDto
  ): Promise<AdminLiveApprovalStatus> {
    this.requireAdmin(operator);

    const activeApproval = await this.findActiveLiveApproval();
    if (activeApproval) {
      throw new ConflictException("Live trading approval is already active");
    }

    const approval = await this.prisma.liveTradingApproval.create({
      data: {
        approvalReason: dto.reason,
        approvedById: operator.userId,
        status: "APPROVED"
      },
      include: liveApprovalInclude
    });

    await this.auditLogService.record({
      action: "live_approval.approved",
      metadata: {
        approvalId: approval.id,
        reason: dto.reason,
        safetyNotice: LIVE_APPROVAL_SAFETY_NOTICE,
        status: "APPROVED"
      },
      userId: operator.userId ?? null
    });

    return {
      latestApproval: this.mapLiveApproval(approval),
      safetyNotice: LIVE_APPROVAL_SAFETY_NOTICE,
      status: "APPROVED"
    };
  }

  async revokeLiveTrading(
    operator: Operator,
    dto: LiveApprovalReasonDto
  ): Promise<AdminLiveApprovalStatus> {
    this.requireAdmin(operator);

    const activeApproval = await this.findActiveLiveApproval();
    if (!activeApproval) {
      throw new NotFoundException("No active live trading approval exists");
    }

    const approval = await this.prisma.liveTradingApproval.update({
      data: {
        revokeReason: dto.reason,
        revokedAt: new Date(),
        revokedById: operator.userId,
        status: "REVOKED"
      },
      include: liveApprovalInclude,
      where: { id: activeApproval.id }
    });

    await this.auditLogService.record({
      action: "live_approval.revoked",
      metadata: {
        approvalId: approval.id,
        reason: dto.reason,
        safetyNotice: LIVE_APPROVAL_SAFETY_NOTICE,
        status: "REVOKED"
      },
      userId: operator.userId ?? null
    });

    return {
      latestApproval: this.mapLiveApproval(approval),
      safetyNotice: LIVE_APPROVAL_SAFETY_NOTICE,
      status: "NOT_APPROVED"
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
      latestMarketSyncJob,
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
      this.prisma.syncJobRun.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          completedAt: true,
          createdAt: true,
          failureReason: true,
          status: true,
          updatedAt: true
        },
        where: { type: "MARKET_SYNC" }
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
      this.queueSyncAdminGate(latestMarketSyncJob),
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

  private depositWalletGate(
    readyCount: number,
    latestUpdatedAt: Date | null,
    latestRelayerFailure: { failureReason: string | null; status: string; updatedAt: Date } | null
  ): AdminRiskGate {
    if (latestRelayerFailure) {
      return {
        key: "deposit-wallet-readiness",
        title: "Deposit Wallet readiness",
        category: "wallet",
        status: "BLOCKED",
        severity: "CRITICAL",
        blocking: true,
        description: "Deposit Wallet readiness is required before real trading readiness.",
        evidence: `Latest relayer failure: ${latestRelayerFailure.failureReason ?? latestRelayerFailure.status}.`,
        updatedAt: latestRelayerFailure.updatedAt
      };
    }

    return {
      key: "deposit-wallet-readiness",
      title: "Deposit Wallet readiness",
      category: "wallet",
      status: readyCount > 0 ? "READY" : "PENDING",
      severity: readyCount > 0 ? "INFO" : "WARNING",
      blocking: true,
      description: "Deposit Wallet readiness is required before real trading readiness.",
      evidence:
        readyCount > 0 ? `${readyCount} ready Deposit Wallet(s).` : "No ready Deposit Wallet exists.",
      updatedAt: latestUpdatedAt
    };
  }

  private fundingReadinessGate(
    latestFundingWallet: {
      balanceAllowanceUpdatedAt: Date | null;
      exchangeAllowance: DecimalLike | null;
      pUsdBalance: DecimalLike | null;
      updatedAt: Date;
    } | null
  ): AdminRiskGate {
    const base = {
      key: "funding-readiness",
      title: "Funding readiness",
      category: "wallet" as const,
      blocking: true,
      description: "Cached Deposit Wallet pUSD balance and CLOB exchange allowance must be fresh and positive."
    };

    if (!latestFundingWallet) {
      return {
        ...base,
        evidence: "No ready Deposit Wallet funding cache exists.",
        severity: "WARNING",
        status: "PENDING",
        updatedAt: null
      };
    }

    const updatedAt = latestFundingWallet.balanceAllowanceUpdatedAt;
    if (!updatedAt) {
      return {
        ...base,
        evidence: "Deposit Wallet funding cache is missing.",
        severity: "WARNING",
        status: "PENDING",
        updatedAt: latestFundingWallet.updatedAt
      };
    }

    if (Date.now() - updatedAt.getTime() > FUNDING_CACHE_TTL_MS) {
      return {
        ...base,
        evidence: "Deposit Wallet funding cache is stale.",
        severity: "WARNING",
        status: "PENDING",
        updatedAt
      };
    }

    const pUsdBalance = decimalText(latestFundingWallet.pUsdBalance);
    const exchangeAllowance = decimalText(latestFundingWallet.exchangeAllowance);

    if (numericAmount(pUsdBalance) <= 0) {
      return {
        ...base,
        evidence: "Deposit Wallet has no pUSD.",
        severity: "WARNING",
        status: "PENDING",
        updatedAt
      };
    }

    if (numericAmount(exchangeAllowance) <= 0) {
      return {
        ...base,
        evidence: "CLOB exchange allowance is missing.",
        severity: "WARNING",
        status: "PENDING",
        updatedAt
      };
    }

    return {
      ...base,
      evidence: `pUSD ${pUsdBalance} and exchange allowance ${exchangeAllowance} are fresh.`,
      severity: "INFO",
      status: "READY",
      updatedAt
    };
  }

  private queueSyncReadinessGate(
    latestMarketSyncJob: {
      completedAt: Date | null;
      createdAt: Date;
      failureReason: string | null;
      status: string;
      updatedAt: Date;
    } | null
  ): AdminRiskGate {
    const base = {
      key: "queue-sync-readiness",
      title: "Queue sync readiness",
      category: "market" as const,
      blocking: true,
      description: "Admin-triggered queue sync should complete before production readiness review."
    };

    if (!latestMarketSyncJob) {
      return {
        ...base,
        evidence: `No market sync queue job has completed yet. ${QUEUE_SYNC_SAFETY_NOTICE}`,
        severity: "WARNING",
        status: "PENDING",
        updatedAt: null
      };
    }

    if (latestMarketSyncJob.status === "SUCCEEDED") {
      return {
        ...base,
        evidence: `Latest market sync queue job succeeded. ${QUEUE_SYNC_SAFETY_NOTICE}`,
        severity: "INFO",
        status: "READY",
        updatedAt: latestMarketSyncJob.completedAt ?? latestMarketSyncJob.updatedAt
      };
    }

    if (latestMarketSyncJob.status === "FAILED") {
      return {
        ...base,
        evidence: `Latest market sync queue job failed: ${
          latestMarketSyncJob.failureReason ?? "unknown failure"
        }. ${QUEUE_SYNC_SAFETY_NOTICE}`,
        severity: "CRITICAL",
        status: "BLOCKED",
        updatedAt: latestMarketSyncJob.completedAt ?? latestMarketSyncJob.updatedAt
      };
    }

    return {
      ...base,
      evidence: `Latest market sync queue job is ${latestMarketSyncJob.status.toLowerCase()}. ${QUEUE_SYNC_SAFETY_NOTICE}`,
      severity: "WARNING",
      status: "PENDING",
      updatedAt: latestMarketSyncJob.updatedAt ?? latestMarketSyncJob.createdAt
    };
  }

  private queueSyncAdminGate(
    latestMarketSyncJob: {
      completedAt: Date | null;
      createdAt: Date;
      failureReason: string | null;
      status: string;
      updatedAt: Date;
    } | null
  ): AdminGate {
    if (!latestMarketSyncJob) {
      return {
        key: "queue-sync-readiness",
        owner: "Engineering",
        status: "PENDING",
        title: "Queue sync readiness",
        updatedAt: null
      };
    }

    if (latestMarketSyncJob.status === "SUCCEEDED") {
      return {
        key: "queue-sync-readiness",
        owner: "Engineering",
        status: "READY",
        title: "Queue sync readiness",
        updatedAt: latestMarketSyncJob.completedAt ?? latestMarketSyncJob.updatedAt
      };
    }

    if (latestMarketSyncJob.status === "FAILED") {
      return {
        details: latestMarketSyncJob.failureReason,
        key: "queue-sync-readiness",
        owner: "Engineering",
        status: "BLOCKED",
        title: "Queue sync readiness",
        updatedAt: latestMarketSyncJob.completedAt ?? latestMarketSyncJob.updatedAt
      };
    }

    return {
      key: "queue-sync-readiness",
      owner: "Engineering",
      status: "PENDING",
      title: "Queue sync readiness",
      updatedAt: latestMarketSyncJob.updatedAt ?? latestMarketSyncJob.createdAt
    };
  }

  private async buildLiveApprovalStatus(): Promise<AdminLiveApprovalStatus> {
    const activeApproval = await this.findActiveLiveApproval();
    const latestApproval = activeApproval ?? (await this.findLatestLiveApproval());

    return {
      latestApproval: latestApproval ? this.mapLiveApproval(latestApproval) : null,
      safetyNotice: LIVE_APPROVAL_SAFETY_NOTICE,
      status: activeApproval ? "APPROVED" : "NOT_APPROVED"
    };
  }

  private findActiveLiveApproval(): Promise<LiveTradingApprovalWithUsers | null> {
    return this.prisma.liveTradingApproval.findFirst({
      include: liveApprovalInclude,
      orderBy: { approvedAt: "desc" },
      where: { revokedAt: null, status: "APPROVED" }
    });
  }

  private findLatestLiveApproval(): Promise<LiveTradingApprovalWithUsers | null> {
    return this.prisma.liveTradingApproval.findFirst({
      include: liveApprovalInclude,
      orderBy: { approvedAt: "desc" }
    });
  }

  private mapLiveApproval(approval: LiveTradingApprovalWithUsers): AdminLiveApprovalRecord {
    return {
      approvalReason: approval.approvalReason,
      approvedAt: approval.approvedAt,
      approvedByEmail: approval.approvedBy?.email ?? null,
      approvedById: approval.approvedById,
      id: approval.id,
      revokeReason: approval.revokeReason,
      revokedAt: approval.revokedAt,
      revokedByEmail: approval.revokedBy?.email ?? null,
      revokedById: approval.revokedById,
      status: approval.status === "APPROVED" ? "APPROVED" : "REVOKED"
    };
  }

  private manualLiveApprovalGate(
    activeApproval: LiveTradingApprovalWithUsers | null
  ): AdminRiskGate {
    const base = {
      key: "manual-live-approval",
      title: "Manual live approval",
      category: "risk" as const,
      blocking: true,
      description: "Manual approval records live-trading readiness but does not enable real CLOB submit."
    };

    if (!activeApproval) {
      return {
        ...base,
        evidence:
          "No active manual live approval exists. This records readiness only and does not enable real CLOB submit.",
        severity: "CRITICAL",
        status: "BLOCKED",
        updatedAt: null
      };
    }

    const operator = activeApproval.approvedBy?.email ?? activeApproval.approvedById ?? "unknown operator";

    return {
      ...base,
      evidence: `Approved by ${operator}: ${activeApproval.approvalReason}. This does not enable real CLOB submit.`,
      severity: "INFO",
      status: "READY",
      updatedAt: activeApproval.approvedAt
    };
  }
}

function decimalText(value: DecimalLike | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toString();
}

function numericAmount(value: string | null): number {
  const numeric = Number(value ?? "0");

  return Number.isFinite(numeric) ? numeric : 0;
}
