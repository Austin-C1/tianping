import { PrismaSyncJobRunsRepository } from "./prisma-sync-job-runs.repository";

describe("PrismaSyncJobRunsRepository", () => {
  const createPrisma = () => ({
    syncJobRun: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    }
  });

  it("creates queued sync job runs with operator and metadata", async () => {
    const prisma = createPrisma();
    const createdAt = new Date("2026-06-30T12:00:00.000Z");
    prisma.syncJobRun.create.mockResolvedValue({
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
      updatedAt: createdAt
    });

    const repository = new PrismaSyncJobRunsRepository(prisma as never);

    await expect(
      repository.create({
        metadata: { source: "admin" },
        requestedById: "admin_1",
        type: "MARKET_SYNC"
      })
    ).resolves.toMatchObject({
      id: "sync_run_1",
      requestedById: "admin_1",
      status: "QUEUED",
      type: "MARKET_SYNC"
    });

    expect(prisma.syncJobRun.create).toHaveBeenCalledWith({
      data: {
        metadata: { source: "admin" },
        requestedById: "admin_1",
        status: "QUEUED",
        type: "MARKET_SYNC"
      }
    });
  });

  it("finds the oldest active run for a sync type", async () => {
    const prisma = createPrisma();
    prisma.syncJobRun.findFirst.mockResolvedValue(null);

    const repository = new PrismaSyncJobRunsRepository(prisma as never);

    await expect(repository.findActiveByType("MARKET_SYNC")).resolves.toBeNull();

    expect(prisma.syncJobRun.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: "asc" },
      where: {
        status: { in: ["QUEUED", "RUNNING"] },
        type: "MARKET_SYNC"
      }
    });
  });

  it("marks runs as running, succeeded, or failed with timestamps and details", async () => {
    const prisma = createPrisma();
    const startedAt = new Date("2026-06-30T12:01:00.000Z");
    const completedAt = new Date("2026-06-30T12:02:00.000Z");
    prisma.syncJobRun.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.syncJobRun.findUnique
      .mockResolvedValueOnce({ id: "sync_run_1", startedAt, status: "RUNNING" })
      .mockResolvedValueOnce({ id: "sync_run_1", completedAt, result: { synced: 3 }, status: "SUCCEEDED" })
      .mockResolvedValueOnce({
        completedAt,
        failureReason: "provider unavailable",
        id: "sync_run_2",
        status: "FAILED"
      });

    const repository = new PrismaSyncJobRunsRepository(prisma as never);

    await repository.markRunning({ id: "sync_run_1", startedAt });
    await repository.markSucceeded({
      completedAt,
      id: "sync_run_1",
      result: { synced: 3 }
    });
    await repository.markFailed({
      completedAt,
      failureReason: "provider unavailable",
      id: "sync_run_2"
    });

    expect(prisma.syncJobRun.updateMany).toHaveBeenNthCalledWith(1, {
      data: {
        startedAt,
        status: "RUNNING"
      },
      where: { id: "sync_run_1", status: "QUEUED" }
    });
    expect(prisma.syncJobRun.updateMany).toHaveBeenNthCalledWith(2, {
      data: {
        completedAt,
        result: { synced: 3 },
        status: "SUCCEEDED"
      },
      where: { id: "sync_run_1", status: "RUNNING" }
    });
    expect(prisma.syncJobRun.updateMany).toHaveBeenNthCalledWith(3, {
      data: {
        completedAt,
        failureReason: "provider unavailable",
        status: "FAILED"
      },
      where: { id: "sync_run_2", status: { in: ["QUEUED", "RUNNING"] } }
    });
  });

  it("returns null when a status transition does not apply", async () => {
    const prisma = createPrisma();
    prisma.syncJobRun.updateMany.mockResolvedValue({ count: 0 });
    const repository = new PrismaSyncJobRunsRepository(prisma as never);

    await expect(
      repository.markRunning({
        id: "sync_run_1",
        startedAt: new Date("2026-06-30T12:01:00.000Z")
      })
    ).resolves.toBeNull();

    expect(prisma.syncJobRun.findUnique).not.toHaveBeenCalled();
  });
});
