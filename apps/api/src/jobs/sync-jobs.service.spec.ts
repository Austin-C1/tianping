import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { SyncJobsService } from "./sync-jobs.service";

describe("SyncJobsService", () => {
  const createdAt = new Date("2026-06-30T12:00:00.000Z");

  const syncJobRun = (overrides: Partial<Record<string, unknown>> = {}) => ({
    completedAt: null,
    createdAt,
    failureReason: null,
    id: "sync_run_1",
    metadata: { source: "admin" },
    queueJobId: null,
    requestedById: "admin_1",
    result: null,
    startedAt: null,
    status: "QUEUED",
    type: "MARKET_SYNC",
    updatedAt: createdAt,
    ...overrides
  });

  const createRepository = () => ({
    attachQueueJob: jest.fn(),
    create: jest.fn(),
    findActiveByType: jest.fn(),
    findById: jest.fn(),
    listRecent: jest.fn(),
    markFailed: jest.fn(),
    markRunning: jest.fn(),
    markSucceeded: jest.fn()
  });

  const createQueue = () => ({
    add: jest.fn()
  });

  const createAuditLogService = () => ({
    record: jest.fn().mockResolvedValue(undefined)
  });

  const createMarketsService = () => ({
    syncActiveMarkets: jest.fn()
  });

  const createService = (
    repository = createRepository(),
    queue = createQueue(),
    auditLogService = createAuditLogService(),
    marketsService = createMarketsService()
  ) =>
    new SyncJobsService(
      queue as never,
      repository as never,
      auditLogService as never,
      marketsService as never
    );

  it("enqueues a market sync job for admin operators and writes an audit entry", async () => {
    const repository = createRepository();
    const queue = createQueue();
    const auditLogService = createAuditLogService();
    repository.findActiveByType.mockResolvedValue(null);
    repository.create.mockResolvedValue(syncJobRun());
    queue.add.mockResolvedValue({ id: "bull_job_1" });
    repository.attachQueueJob.mockResolvedValue(syncJobRun({ queueJobId: "bull_job_1" }));
    const service = createService(repository, queue, auditLogService);

    await expect(
      service.enqueueMarketSync({
        email: "admin@pmx.local",
        role: "ADMIN",
        userId: "admin_1"
      })
    ).resolves.toMatchObject({
      id: "sync_run_1",
      queueJobId: "bull_job_1",
      status: "QUEUED",
      type: "MARKET_SYNC"
    });

    expect(repository.findActiveByType).toHaveBeenCalledWith("MARKET_SYNC");
    expect(repository.create).toHaveBeenCalledWith({
      metadata: {
        requestedByEmail: "admin@pmx.local",
        safetyNotice: "Queued sync records readiness only. It does not enable real CLOB submit.",
        source: "admin"
      },
      requestedById: "admin_1",
      type: "MARKET_SYNC"
    });
    expect(queue.add).toHaveBeenCalledWith(
      "market-sync.run",
      { syncJobRunId: "sync_run_1" },
      {
        attempts: 1,
        jobId: "sync_run_1",
        removeOnComplete: 100,
        removeOnFail: 100
      }
    );
    expect(repository.attachQueueJob).toHaveBeenCalledWith({
      id: "sync_run_1",
      queueJobId: "bull_job_1"
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "sync.market.enqueued",
      metadata: {
        queueJobId: "bull_job_1",
        safetyNotice: "Queued sync records readiness only. It does not enable real CLOB submit.",
        syncJobRunId: "sync_run_1",
        type: "MARKET_SYNC"
      },
      userId: "admin_1"
    });
  });

  it("returns the active market sync run without enqueueing duplicates", async () => {
    const repository = createRepository();
    const queue = createQueue();
    const auditLogService = createAuditLogService();
    repository.findActiveByType.mockResolvedValue(syncJobRun({ status: "RUNNING" }));
    const service = createService(repository, queue, auditLogService);

    await expect(service.enqueueMarketSync({ role: "ADMIN", userId: "admin_1" })).resolves.toMatchObject({
      id: "sync_run_1",
      status: "RUNNING"
    });

    expect(repository.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
    expect(auditLogService.record).not.toHaveBeenCalled();
  });

  it("marks a job failed when queue enqueue fails", async () => {
    const repository = createRepository();
    const queue = createQueue();
    const auditLogService = createAuditLogService();
    repository.findActiveByType.mockResolvedValue(null);
    repository.create.mockResolvedValue(syncJobRun());
    queue.add.mockRejectedValue(new Error("redis unavailable"));
    repository.markFailed.mockResolvedValue(
      syncJobRun({
        completedAt: new Date("2026-06-30T12:01:00.000Z"),
        failureReason: "redis unavailable",
        status: "FAILED"
      })
    );
    const service = createService(repository, queue, auditLogService);

    await expect(service.enqueueMarketSync({ role: "ADMIN", userId: "admin_1" })).rejects.toBeInstanceOf(
      ConflictException
    );

    expect(repository.markFailed).toHaveBeenCalledWith({
      completedAt: expect.any(Date),
      failureReason: "redis unavailable",
      id: "sync_run_1",
      result: {
        stage: "enqueue"
      }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "sync.market.failed",
      metadata: {
        failureReason: "redis unavailable",
        result: {
          stage: "enqueue"
        },
        syncJobRunId: "sync_run_1",
        type: "MARKET_SYNC"
      },
      userId: "admin_1"
    });
  });

  it("returns the active run when concurrent enqueue hits the active job unique constraint", async () => {
    const repository = createRepository();
    const queue = createQueue();
    const uniqueError = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002"
    });
    repository.findActiveByType
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(syncJobRun({ status: "QUEUED" }));
    repository.create.mockRejectedValue(uniqueError);
    const service = createService(repository, queue);

    await expect(service.enqueueMarketSync({ role: "ADMIN", userId: "admin_1" })).resolves.toMatchObject({
      id: "sync_run_1",
      status: "QUEUED"
    });

    expect(queue.add).not.toHaveBeenCalled();
  });

  it("lists and loads sync jobs for admin operators", async () => {
    const repository = createRepository();
    repository.listRecent.mockResolvedValue([syncJobRun()]);
    repository.findById.mockResolvedValue(syncJobRun());
    const service = createService(repository);

    await expect(service.listJobs({ role: "ADMIN" })).resolves.toEqual([syncJobRun()]);
    await expect(service.getJob({ role: "ADMIN" }, "sync_run_1")).resolves.toEqual(syncJobRun());
    await service.listJobs({ role: "ADMIN" }, { type: "MARKET_SYNC" });

    expect(repository.listRecent).toHaveBeenNthCalledWith(1, { limit: 20, type: undefined });
    expect(repository.listRecent).toHaveBeenNthCalledWith(2, { limit: 20, type: "MARKET_SYNC" });
    expect(repository.findById).toHaveBeenCalledWith("sync_run_1");
  });

  it("rejects missing jobs and non-admin operators", async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);
    const service = createService(repository);

    await expect(service.getJob({ role: "ADMIN" }, "missing")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.enqueueMarketSync({ role: "USER", userId: "user_1" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.listJobs({ role: "USER", userId: "user_1" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(service.getJob({ role: "USER", userId: "user_1" }, "sync_run_1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("processes successful market sync jobs and writes completion audit", async () => {
    const repository = createRepository();
    const auditLogService = createAuditLogService();
    const marketsService = createMarketsService();
    repository.markRunning.mockResolvedValue(syncJobRun({ startedAt: new Date("2026-06-30T12:01:00.000Z") }));
    marketsService.syncActiveMarkets.mockResolvedValue({
      failed: 0,
      quotesFailed: 0,
      quotesSynced: 4,
      synced: 2
    });
    repository.markSucceeded.mockResolvedValue(
      syncJobRun({
        completedAt: new Date("2026-06-30T12:02:00.000Z"),
        result: { synced: 2 },
        status: "SUCCEEDED"
      })
    );
    const service = createService(repository, createQueue(), auditLogService, marketsService);

    await expect(service.processMarketSyncJob("sync_run_1")).resolves.toMatchObject({
      id: "sync_run_1",
      status: "SUCCEEDED"
    });

    expect(repository.markRunning).toHaveBeenCalledWith({
      id: "sync_run_1",
      startedAt: expect.any(Date)
    });
    expect(marketsService.syncActiveMarkets).toHaveBeenCalledWith({ role: "ADMIN" });
    expect(repository.markSucceeded).toHaveBeenCalledWith({
      completedAt: expect.any(Date),
      id: "sync_run_1",
      result: {
        failed: 0,
        quotesFailed: 0,
        quotesSynced: 4,
        synced: 2
      }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "sync.market.completed",
      metadata: {
        result: {
          failed: 0,
          quotesFailed: 0,
          quotesSynced: 4,
          synced: 2
        },
        syncJobRunId: "sync_run_1",
        type: "MARKET_SYNC"
      },
      userId: null
    });
  });

  it("does not reprocess terminal sync jobs delivered again by the queue", async () => {
    const repository = createRepository();
    const auditLogService = createAuditLogService();
    const marketsService = createMarketsService();
    repository.markRunning.mockResolvedValue(null);
    repository.findById.mockResolvedValue(
      syncJobRun({
        completedAt: new Date("2026-06-30T12:02:00.000Z"),
        status: "SUCCEEDED"
      })
    );
    const service = createService(repository, createQueue(), auditLogService, marketsService);

    await expect(service.processMarketSyncJob("sync_run_1")).resolves.toMatchObject({
      id: "sync_run_1",
      status: "SUCCEEDED"
    });

    expect(marketsService.syncActiveMarkets).not.toHaveBeenCalled();
    expect(repository.markSucceeded).not.toHaveBeenCalled();
    expect(repository.markFailed).not.toHaveBeenCalled();
    expect(auditLogService.record).not.toHaveBeenCalled();
  });

  it("marks processor runs failed when market sync returns an error", async () => {
    const repository = createRepository();
    const auditLogService = createAuditLogService();
    const marketsService = createMarketsService();
    repository.markRunning.mockResolvedValue(syncJobRun({ status: "RUNNING" }));
    marketsService.syncActiveMarkets.mockResolvedValue({
      error: "provider unavailable",
      failed: 1,
      quotesFailed: 0,
      quotesSynced: 0,
      synced: 0
    });
    repository.markFailed.mockResolvedValue(
      syncJobRun({
        completedAt: new Date("2026-06-30T12:02:00.000Z"),
        failureReason: "provider unavailable",
        status: "FAILED"
      })
    );
    const service = createService(repository, createQueue(), auditLogService, marketsService);

    await expect(service.processMarketSyncJob("sync_run_1")).resolves.toMatchObject({
      failureReason: "provider unavailable",
      status: "FAILED"
    });

    expect(repository.markFailed).toHaveBeenCalledWith({
      completedAt: expect.any(Date),
      failureReason: "provider unavailable",
      id: "sync_run_1",
      result: {
        error: "provider unavailable",
        failed: 1,
        quotesFailed: 0,
        quotesSynced: 0,
        synced: 0
      }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "sync.market.failed",
      metadata: {
        failureReason: "provider unavailable",
        result: {
          error: "provider unavailable",
          failed: 1,
          quotesFailed: 0,
          quotesSynced: 0,
          synced: 0
        },
        syncJobRunId: "sync_run_1",
        type: "MARKET_SYNC"
      },
      userId: null
    });
  });
});
