import { ForbiddenException } from "@nestjs/common";
import type { OrderRouterEnvironment } from "../order-router/order-router.config";
import { AdminService } from "./admin.service";

describe("AdminService", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const createPrisma = () => ({
    auditLog: {
      findFirst: jest.fn(),
      findMany: jest.fn()
    },
    liveTradingApproval: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    },
    user: {
      count: jest.fn()
    },
    wallet: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    depositWallet: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    marketSnapshot: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    marketQuoteSnapshot: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    order: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    rateLimitEvent: {
      count: jest.fn(),
      findFirst: jest.fn()
    },
    relayerTransaction: {
      findFirst: jest.fn()
    }
  });
  const previewEnvironment: OrderRouterEnvironment = {
    builderCodeConfigured: false,
    chainId: null,
    clobHost: "https://clob.polymarket.com",
    liveTradingEnabled: false,
    mode: "preview" as const,
    relayerConfigured: false,
    rpcConfigured: false
  };
  const createOrderRouterConfig = (environment: OrderRouterEnvironment = previewEnvironment) => ({
    getEnvironment: jest.fn(() => environment)
  });
  const createAuditLogService = () => ({
    record: jest.fn().mockResolvedValue(undefined)
  });

  it("returns operations summary for admin operators", async () => {
    const prisma = createPrisma();
    prisma.user.count.mockResolvedValueOnce(7).mockResolvedValueOnce(2);
    prisma.wallet.count.mockResolvedValue(3);
    prisma.depositWallet.count.mockResolvedValue(0);
    prisma.marketSnapshot.count.mockResolvedValue(11);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(22);
    prisma.order.count.mockResolvedValue(5);
    prisma.rateLimitEvent.count.mockResolvedValue(1);
    prisma.marketSnapshot.findFirst.mockResolvedValue({
      syncedAt: new Date("2026-06-24T00:00:00.000Z")
    });
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue({
      syncedAt: new Date("2026-06-24T00:01:00.000Z")
    });
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      createAuditLogService() as never
    );

    await expect(service.getSummary({ role: "ADMIN" })).resolves.toEqual({
      registeredUsers: 7,
      adminUsers: 2,
      walletsConnected: 3,
      marketsSynced: 11,
      latestMarketSyncedAt: new Date("2026-06-24T00:00:00.000Z"),
      marketQuotesSynced: 22,
      latestMarketQuoteSyncedAt: new Date("2026-06-24T00:01:00.000Z"),
      ordersPreviewed: 5,
      openRiskEvents: 1
    });
    expect(prisma.user.count).toHaveBeenNthCalledWith(1);
    expect(prisma.user.count).toHaveBeenNthCalledWith(2, {
      where: { role: "ADMIN" }
    });
    expect(prisma.wallet.count).toHaveBeenCalledWith({
      where: { type: "EOA" }
    });
    expect(prisma.marketSnapshot.count).toHaveBeenCalledWith();
    expect(prisma.marketQuoteSnapshot.count).toHaveBeenCalledWith();
    expect(prisma.marketSnapshot.findFirst).toHaveBeenCalledWith({
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true }
    });
    expect(prisma.marketQuoteSnapshot.findFirst).toHaveBeenCalledWith({
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true }
    });
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { status: "PREVIEWED" }
    });
    expect(prisma.rateLimitEvent.count).toHaveBeenCalledWith();
  });

  it("returns recent audit logs for admin operators", async () => {
    const prisma = createPrisma();
    const createdAt = new Date("2026-06-30T10:00:00.000Z");
    prisma.auditLog.findMany.mockResolvedValue([
      {
        action: "order.signed",
        createdAt,
        id: "audit_1",
        ipAddress: null,
        metadata: { orderId: "order_1" },
        user: { email: "user@example.com" },
        userAgent: null,
        userId: "user_1"
      }
    ]);
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      createAuditLogService() as never
    );

    await expect(service.getAuditLogs({ role: "ADMIN" })).resolves.toEqual([
      {
        action: "order.signed",
        createdAt,
        id: "audit_1",
        ipAddress: null,
        metadata: { orderId: "order_1" },
        userEmail: "user@example.com",
        userAgent: null,
        userId: "user_1"
      }
    ]);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  });

  it("returns the latest live approval status for admin operators", async () => {
    const prisma = createPrisma();
    const approvedAt = new Date("2026-06-30T10:00:00.000Z");
    const revokedAt = new Date("2026-06-30T10:30:00.000Z");
    prisma.liveTradingApproval.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        approvalReason: "funding and audit reviewed",
        approvedAt,
        approvedBy: { email: "admin@pmx.local" },
        approvedById: "admin_1",
        id: "approval_1",
        revokeReason: "operator paused",
        revokedAt,
        revokedBy: { email: "risk@pmx.local" },
        revokedById: "admin_2",
        status: "REVOKED"
      });
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      createAuditLogService() as never
    );

    await expect(service.getLiveApproval({ role: "ADMIN", userId: "admin_1" })).resolves.toEqual({
      latestApproval: {
        approvalReason: "funding and audit reviewed",
        approvedAt,
        approvedByEmail: "admin@pmx.local",
        approvedById: "admin_1",
        id: "approval_1",
        revokeReason: "operator paused",
        revokedAt,
        revokedByEmail: "risk@pmx.local",
        revokedById: "admin_2",
        status: "REVOKED"
      },
      safetyNotice: "Manual approval records readiness only. It does not enable real CLOB submit.",
      status: "NOT_APPROVED"
    });
    expect(prisma.liveTradingApproval.findFirst).toHaveBeenNthCalledWith(1, {
      include: {
        approvedBy: {
          select: { email: true }
        },
        revokedBy: {
          select: { email: true }
        }
      },
      orderBy: { approvedAt: "desc" },
      where: { revokedAt: null, status: "APPROVED" }
    });
    expect(prisma.liveTradingApproval.findFirst).toHaveBeenNthCalledWith(2, {
      include: {
        approvedBy: {
          select: { email: true }
        },
        revokedBy: {
          select: { email: true }
        }
      },
      orderBy: { approvedAt: "desc" }
    });
  });

  it("creates a live approval record and audit entry for admin operators", async () => {
    const prisma = createPrisma();
    const auditLogService = createAuditLogService();
    const approvedAt = new Date("2026-06-30T11:00:00.000Z");
    prisma.liveTradingApproval.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      approvalReason: "funding and audit reviewed",
      approvedAt,
      approvedBy: { email: "admin@pmx.local" },
      approvedById: "admin_1",
      id: "approval_1",
      revokeReason: null,
      revokedAt: null,
      revokedBy: null,
      revokedById: null,
      status: "APPROVED"
    });
    prisma.liveTradingApproval.create.mockResolvedValue({
      approvalReason: "funding and audit reviewed",
      approvedAt,
      approvedBy: { email: "admin@pmx.local" },
      approvedById: "admin_1",
      id: "approval_1",
      revokeReason: null,
      revokedAt: null,
      revokedBy: null,
      revokedById: null,
      status: "APPROVED"
    });
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      auditLogService as never
    );

    await expect(
      service.approveLiveTrading(
        { email: "admin@pmx.local", role: "ADMIN", userId: "admin_1" },
        { reason: "funding and audit reviewed" }
      )
    ).resolves.toEqual({
      latestApproval: {
        approvalReason: "funding and audit reviewed",
        approvedAt,
        approvedByEmail: "admin@pmx.local",
        approvedById: "admin_1",
        id: "approval_1",
        revokeReason: null,
        revokedAt: null,
        revokedByEmail: null,
        revokedById: null,
        status: "APPROVED"
      },
      safetyNotice: "Manual approval records readiness only. It does not enable real CLOB submit.",
      status: "APPROVED"
    });
    expect(prisma.liveTradingApproval.create).toHaveBeenCalledWith({
      data: {
        approvalReason: "funding and audit reviewed",
        approvedById: "admin_1",
        status: "APPROVED"
      },
      include: {
        approvedBy: {
          select: { email: true }
        },
        revokedBy: {
          select: { email: true }
        }
      }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "live_approval.approved",
      metadata: {
        approvalId: "approval_1",
        reason: "funding and audit reviewed",
        safetyNotice: "Manual approval records readiness only. It does not enable real CLOB submit.",
        status: "APPROVED"
      },
      userId: "admin_1"
    });
  });

  it("revokes the active live approval record and writes an audit entry", async () => {
    const prisma = createPrisma();
    const auditLogService = createAuditLogService();
    const approvedAt = new Date("2026-06-30T11:00:00.000Z");
    const revokedAt = new Date("2026-06-30T11:30:00.000Z");
    prisma.liveTradingApproval.findFirst.mockResolvedValueOnce({
      approvalReason: "funding and audit reviewed",
      approvedAt,
      approvedBy: { email: "admin@pmx.local" },
      approvedById: "admin_1",
      id: "approval_1",
      revokeReason: null,
      revokedAt: null,
      revokedBy: null,
      revokedById: null,
      status: "APPROVED"
    });
    prisma.liveTradingApproval.update.mockResolvedValue({
      approvalReason: "funding and audit reviewed",
      approvedAt,
      approvedBy: { email: "admin@pmx.local" },
      approvedById: "admin_1",
      id: "approval_1",
      revokeReason: "operator revoked",
      revokedAt,
      revokedBy: { email: "admin@pmx.local" },
      revokedById: "admin_1",
      status: "REVOKED"
    });
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      auditLogService as never
    );

    await expect(
      service.revokeLiveTrading(
        { email: "admin@pmx.local", role: "ADMIN", userId: "admin_1" },
        { reason: "operator revoked" }
      )
    ).resolves.toEqual({
      latestApproval: {
        approvalReason: "funding and audit reviewed",
        approvedAt,
        approvedByEmail: "admin@pmx.local",
        approvedById: "admin_1",
        id: "approval_1",
        revokeReason: "operator revoked",
        revokedAt,
        revokedByEmail: "admin@pmx.local",
        revokedById: "admin_1",
        status: "REVOKED"
      },
      safetyNotice: "Manual approval records readiness only. It does not enable real CLOB submit.",
      status: "NOT_APPROVED"
    });
    expect(prisma.liveTradingApproval.update).toHaveBeenCalledWith({
      data: {
        revokeReason: "operator revoked",
        revokedAt: expect.any(Date),
        revokedById: "admin_1",
        status: "REVOKED"
      },
      include: {
        approvedBy: {
          select: { email: true }
        },
        revokedBy: {
          select: { email: true }
        }
      },
      where: { id: "approval_1" }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "live_approval.revoked",
      metadata: {
        approvalId: "approval_1",
        reason: "operator revoked",
        safetyNotice: "Manual approval records readiness only. It does not enable real CLOB submit.",
        status: "REVOKED"
      },
      userId: "admin_1"
    });
  });

  it("returns risk gates that keep live orders blocked until manual approval exists", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-30T09:04:30.000Z"));
    const prisma = createPrisma();
    const marketSyncedAt = new Date("2026-06-30T09:00:00.000Z");
    const quoteSyncedAt = new Date("2026-06-30T09:01:00.000Z");
    const walletUpdatedAt = new Date("2026-06-30T09:02:00.000Z");
    const depositUpdatedAt = new Date("2026-06-30T09:03:00.000Z");
    const auditCreatedAt = new Date("2026-06-30T09:04:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(3);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(6);
    prisma.wallet.count.mockResolvedValue(1);
    prisma.depositWallet.count.mockResolvedValue(1);
    prisma.rateLimitEvent.count.mockResolvedValue(2);
    prisma.marketSnapshot.findFirst.mockResolvedValue({ syncedAt: marketSyncedAt });
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue({ syncedAt: quoteSyncedAt });
    prisma.wallet.findFirst.mockResolvedValue({ updatedAt: walletUpdatedAt });
    prisma.depositWallet.findFirst.mockResolvedValue({
      balanceAllowanceUpdatedAt: new Date("2026-06-30T09:04:00.000Z"),
      exchangeAllowance: "100",
      pUsdBalance: "50",
      updatedAt: depositUpdatedAt
    });
    prisma.relayerTransaction.findFirst.mockResolvedValue(null);
    prisma.auditLog.findFirst.mockResolvedValue({ createdAt: auditCreatedAt });
    prisma.liveTradingApproval.findFirst.mockResolvedValue(null);
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig({
        builderCodeConfigured: true,
        chainId: 137,
        clobHost: "https://clob.polymarket.com",
        liveTradingEnabled: true,
        mode: "live",
        relayerConfigured: true,
        rpcConfigured: true
      }) as never,
      createAuditLogService() as never
    );

    await expect(service.getRiskGateReport({ role: "ADMIN" })).resolves.toEqual({
      blockingCount: 2,
      canSubmitLiveOrders: false,
      generatedAt: expect.any(Date),
      liveTradingEnabled: true,
      mode: "live",
      warningCount: 1,
      gates: expect.arrayContaining([
        expect.objectContaining({
          blocking: true,
          evidence: "ORDER_ROUTER_MODE=live would allow live routing when fully configured.",
          key: "order-router-safe-mode",
          severity: "CRITICAL",
          status: "BLOCKED",
          title: "Order Router safe mode"
        }),
        expect.objectContaining({
          blocking: false,
          evidence: "2 rate-limit event(s) require review.",
          key: "risk-event-review",
          severity: "WARNING",
          status: "PENDING",
          title: "Risk event review"
        }),
        expect.objectContaining({
          blocking: true,
          evidence: "No active manual live approval exists. This records readiness only and does not enable real CLOB submit.",
          key: "manual-live-approval",
          severity: "CRITICAL",
          status: "BLOCKED",
          title: "Manual live approval"
        }),
        expect.objectContaining({
          blocking: true,
          evidence: "Latest audit log exists.",
          key: "audit-trail",
          severity: "INFO",
          status: "READY",
          updatedAt: auditCreatedAt
        }),
        expect.objectContaining({
          blocking: true,
          evidence: "pUSD 50 and exchange allowance 100 are fresh.",
          key: "funding-readiness",
          severity: "INFO",
          status: "READY",
          title: "Funding readiness",
          updatedAt: new Date("2026-06-30T09:04:00.000Z")
        })
      ])
    });
    expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true }
    });
  });

  it("marks the manual live approval risk gate ready from an active approval record", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-30T12:05:00.000Z"));
    const prisma = createPrisma();
    const approvedAt = new Date("2026-06-30T12:00:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(1);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(1);
    prisma.wallet.count.mockResolvedValue(1);
    prisma.depositWallet.count.mockResolvedValue(1);
    prisma.rateLimitEvent.count.mockResolvedValue(0);
    prisma.marketSnapshot.findFirst.mockResolvedValue({ syncedAt: approvedAt });
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue({ syncedAt: approvedAt });
    prisma.wallet.findFirst.mockResolvedValue({ updatedAt: approvedAt });
    prisma.depositWallet.findFirst.mockResolvedValue({
      balanceAllowanceUpdatedAt: approvedAt,
      exchangeAllowance: "100",
      pUsdBalance: "50",
      updatedAt: approvedAt
    });
    prisma.relayerTransaction.findFirst.mockResolvedValue(null);
    prisma.auditLog.findFirst.mockResolvedValue({ createdAt: approvedAt });
    prisma.liveTradingApproval.findFirst.mockResolvedValue({
      approvalReason: "funding and audit reviewed",
      approvedAt,
      approvedBy: { email: "admin@pmx.local" },
      approvedById: "admin_1",
      id: "approval_1",
      revokeReason: null,
      revokedAt: null,
      revokedBy: null,
      revokedById: null,
      status: "APPROVED"
    });
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig({
        builderCodeConfigured: true,
        chainId: 137,
        clobHost: "https://clob.polymarket.com",
        liveTradingEnabled: false,
        mode: "paper",
        relayerConfigured: true,
        rpcConfigured: true
      }) as never,
      createAuditLogService() as never
    );

    await expect(service.getRiskGateReport({ role: "ADMIN" })).resolves.toMatchObject({
      canSubmitLiveOrders: false,
      gates: expect.arrayContaining([
        expect.objectContaining({
          blocking: true,
          evidence:
            "Approved by admin@pmx.local: funding and audit reviewed. This does not enable real CLOB submit.",
          key: "manual-live-approval",
          severity: "INFO",
          status: "READY",
          title: "Manual live approval",
          updatedAt: approvedAt
        })
      ]),
      liveTradingEnabled: false,
      mode: "paper"
    });
  });

  it("marks funding readiness pending when Deposit Wallet funding cache is stale", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-30T09:10:00.000Z"));
    const prisma = createPrisma();
    prisma.marketSnapshot.count.mockResolvedValue(1);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(1);
    prisma.wallet.count.mockResolvedValue(1);
    prisma.depositWallet.count.mockResolvedValue(1);
    prisma.rateLimitEvent.count.mockResolvedValue(0);
    prisma.marketSnapshot.findFirst.mockResolvedValue({ syncedAt: new Date("2026-06-30T09:00:00.000Z") });
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue({ syncedAt: new Date("2026-06-30T09:00:00.000Z") });
    prisma.wallet.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-30T09:00:00.000Z") });
    prisma.depositWallet.findFirst.mockResolvedValue({
      balanceAllowanceUpdatedAt: new Date("2026-06-30T09:00:00.000Z"),
      exchangeAllowance: "100",
      pUsdBalance: "50",
      updatedAt: new Date("2026-06-30T09:00:00.000Z")
    });
    prisma.relayerTransaction.findFirst.mockResolvedValue(null);
    prisma.auditLog.findFirst.mockResolvedValue({ createdAt: new Date("2026-06-30T09:00:00.000Z") });
    prisma.liveTradingApproval.findFirst.mockResolvedValue(null);
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      createAuditLogService() as never
    );

    await expect(service.getRiskGateReport({ role: "ADMIN" })).resolves.toMatchObject({
      gates: expect.arrayContaining([
        expect.objectContaining({
          evidence: "Deposit Wallet funding cache is stale.",
          key: "funding-readiness",
          severity: "WARNING",
          status: "PENDING"
        })
      ])
    });
  });

  it("returns gate statuses from current operational data", async () => {
    const prisma = createPrisma();
    const marketSyncedAt = new Date("2026-06-23T08:00:00.000Z");
    const quoteSyncedAt = new Date("2026-06-23T08:01:00.000Z");
    const walletUpdatedAt = new Date("2026-06-23T09:00:00.000Z");
    const orderUpdatedAt = new Date("2026-06-23T10:00:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(2);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(4);
    prisma.wallet.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    prisma.depositWallet.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(4);
    prisma.marketSnapshot.findFirst.mockResolvedValue({ syncedAt: marketSyncedAt });
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue({ syncedAt: quoteSyncedAt });
    prisma.wallet.findFirst
      .mockResolvedValueOnce({ updatedAt: walletUpdatedAt })
      .mockResolvedValueOnce(null);
    prisma.depositWallet.findFirst.mockResolvedValue(null);
    prisma.relayerTransaction.findFirst.mockResolvedValue(null);
    prisma.order.findFirst.mockResolvedValue({ updatedAt: orderUpdatedAt });
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      createAuditLogService() as never
    );

    await expect(service.getGates({ role: "ADMIN" })).resolves.toEqual([
      {
        key: "market-data-sync",
        title: "Market data sync",
        owner: "Engineering",
        status: "READY",
        updatedAt: marketSyncedAt
      },
      {
        key: "market-quote-sync",
        title: "Market quote sync",
        owner: "Engineering",
        status: "READY",
        updatedAt: quoteSyncedAt
      },
      {
        key: "wallet-binding-proof",
        title: "Wallet binding proof",
        owner: "Product",
        status: "READY",
        updatedAt: walletUpdatedAt
      },
      {
        key: "deposit-wallet-readiness",
        title: "Deposit Wallet readiness",
        owner: "Compliance",
        status: "PENDING",
        updatedAt: null
      },
      {
        key: "real-order-confirmation",
        title: "Real order confirmation",
        owner: "Risk",
        status: "BLOCKED",
        updatedAt: orderUpdatedAt
      }
    ]);
  });

  it("rejects non-admin operators", async () => {
    const prisma = createPrisma();
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      createAuditLogService() as never
    );

    await expect(service.getSummary({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.getGates({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.getAuditLogs({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.getRiskGateReport({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.getLiveApproval({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(
      service.approveLiveTrading({ role: "USER" }, { reason: "funding and audit reviewed" })
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.revokeLiveTrading({ role: "USER" }, { reason: "operator revoked" })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => service.getEnvironment({ role: "USER" })).toThrow(ForbiddenException);
    expect(prisma.user.count).not.toHaveBeenCalled();
    expect(prisma.auditLog.findFirst).not.toHaveBeenCalled();
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(prisma.liveTradingApproval.findFirst).not.toHaveBeenCalled();
    expect(prisma.liveTradingApproval.create).not.toHaveBeenCalled();
    expect(prisma.liveTradingApproval.update).not.toHaveBeenCalled();
  });

  it("returns order router environment for admin operators", () => {
    const prisma = createPrisma();
    const orderRouterConfig = createOrderRouterConfig({
      builderCodeConfigured: true,
      chainId: 137,
      clobHost: "https://clob.polymarket.com",
      liveTradingEnabled: false,
      mode: "paper",
      relayerConfigured: true,
      rpcConfigured: true
    });
    const service = new AdminService(
      prisma as never,
      orderRouterConfig as never,
      createAuditLogService() as never
    );

    expect(service.getEnvironment({ role: "ADMIN" })).toEqual({
      builderCodeConfigured: true,
      chainId: 137,
      clobHost: "https://clob.polymarket.com",
      liveTradingEnabled: false,
      mode: "paper",
      relayerConfigured: true,
      rpcConfigured: true
    });
    expect(orderRouterConfig.getEnvironment).toHaveBeenCalledWith();
  });

  it("marks Deposit Wallet gate ready from production DepositWallet rows", async () => {
    const prisma = createPrisma();
    const depositUpdatedAt = new Date("2026-06-24T12:00:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(0);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(0);
    prisma.wallet.count.mockResolvedValue(0);
    prisma.depositWallet.count.mockResolvedValue(1);
    prisma.marketSnapshot.findFirst.mockResolvedValue(null);
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue(null);
    prisma.wallet.findFirst.mockResolvedValue(null);
    prisma.depositWallet.findFirst.mockResolvedValue({ updatedAt: depositUpdatedAt });
    prisma.relayerTransaction.findFirst.mockResolvedValue(null);
    prisma.order.findFirst.mockResolvedValue(null);
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      createAuditLogService() as never
    );

    await expect(service.getGates({ role: "ADMIN" })).resolves.toEqual(
      expect.arrayContaining([
        {
          key: "deposit-wallet-readiness",
          owner: "Compliance",
          status: "READY",
          title: "Deposit Wallet readiness",
          updatedAt: depositUpdatedAt
        }
      ])
    );
    expect(prisma.depositWallet.count).toHaveBeenCalledWith({
      where: { status: "READY" }
    });
  });

  it("surfaces the latest failed relayer reason in the Deposit Wallet admin gate", async () => {
    const prisma = createPrisma();
    const failedAt = new Date("2026-06-24T12:03:00.000Z");
    prisma.marketSnapshot.count.mockResolvedValue(0);
    prisma.marketQuoteSnapshot.count.mockResolvedValue(0);
    prisma.wallet.count.mockResolvedValue(1);
    prisma.depositWallet.count.mockResolvedValue(0);
    prisma.marketSnapshot.findFirst.mockResolvedValue(null);
    prisma.marketQuoteSnapshot.findFirst.mockResolvedValue(null);
    prisma.wallet.findFirst.mockResolvedValue({ updatedAt: failedAt });
    prisma.depositWallet.findFirst.mockResolvedValue({ updatedAt: failedAt });
    prisma.relayerTransaction.findFirst.mockResolvedValue({
      failureReason: "relayer unavailable",
      relayerTransactionId: null,
      status: "FAILED",
      updatedAt: failedAt
    });
    prisma.order.findFirst.mockResolvedValue(null);
    const service = new AdminService(
      prisma as never,
      createOrderRouterConfig() as never,
      createAuditLogService() as never
    );

    await expect(service.getGates({ role: "ADMIN" })).resolves.toEqual(
      expect.arrayContaining([
        {
          details: "relayer unavailable",
          key: "deposit-wallet-readiness",
          owner: "Compliance",
          status: "BLOCKED",
          title: "Deposit Wallet readiness",
          updatedAt: failedAt
        }
      ])
    );
    expect(prisma.relayerTransaction.findFirst).toHaveBeenCalledWith({
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
    });
  });
});
