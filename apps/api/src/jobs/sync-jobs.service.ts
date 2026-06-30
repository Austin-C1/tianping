import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { AuditLogService } from "../compliance/audit-log.service";
import {
  SYNC_JOB_RUNS_REPOSITORY
} from "../infrastructure/repositories/repository.tokens";
import type {
  ListSyncJobRunsInput,
  SyncJobRunRecord,
  SyncJobRunsRepository,
  SyncJobRunType
} from "../infrastructure/repositories/repository.types";
import { MarketsService } from "../markets/markets.service";
import { QUEUE_NAMES } from "./queue-names";

export interface SyncJobsOperator {
  email?: string;
  role: "USER" | "ADMIN";
  userId?: string;
}

export interface MarketSyncJobData {
  syncJobRunId: string;
}

interface MarketSyncResult {
  error?: string;
  failed: number;
  quotesFailed: number;
  quotesSynced: number;
  synced: number;
}

const MARKET_SYNC_JOB_NAME = "market-sync.run";
const QUEUED_SYNC_SAFETY_NOTICE =
  "Queued sync records readiness only. It does not enable real CLOB submit.";

@Injectable()
export class SyncJobsService {
  constructor(
    @InjectQueue(QUEUE_NAMES.marketSync)
    private readonly marketSyncQueue: Pick<Queue<MarketSyncJobData>, "add">,
    @Inject(SYNC_JOB_RUNS_REPOSITORY)
    private readonly syncJobRunsRepository: SyncJobRunsRepository,
    @Inject(AuditLogService)
    private readonly auditLogService: Pick<AuditLogService, "record"> = {
      record: async () => undefined
    },
    private readonly marketsService: MarketsService
  ) {}

  async enqueueMarketSync(operator: SyncJobsOperator): Promise<SyncJobRunRecord> {
    this.requireAdmin(operator);

    const activeRun = await this.syncJobRunsRepository.findActiveByType("MARKET_SYNC");
    if (activeRun) {
      return activeRun;
    }

    let run: SyncJobRunRecord | null = null;
    try {
      run = await this.syncJobRunsRepository.create({
        metadata: {
          requestedByEmail: operator.email,
          safetyNotice: QUEUED_SYNC_SAFETY_NOTICE,
          source: "admin"
        },
        requestedById: operator.userId ?? null,
        type: "MARKET_SYNC"
      });
      const job = await this.marketSyncQueue.add(
        MARKET_SYNC_JOB_NAME,
        { syncJobRunId: run.id },
        {
          attempts: 1,
          jobId: run.id,
          removeOnComplete: 100,
          removeOnFail: 100
        }
      );
      const queueJobId = String(job.id ?? run.id);
      const queuedRun = await this.syncJobRunsRepository.attachQueueJob({
        id: run.id,
        queueJobId
      });

      await this.auditLogService.record({
        action: "sync.market.enqueued",
        metadata: {
          queueJobId,
          safetyNotice: QUEUED_SYNC_SAFETY_NOTICE,
          syncJobRunId: run.id,
          type: "MARKET_SYNC"
        },
        userId: operator.userId ?? null
      });

      return queuedRun;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const activeRun = await this.syncJobRunsRepository.findActiveByType("MARKET_SYNC");
        if (activeRun) {
          return activeRun;
        }
      }

      if (run) {
        const failureReason = this.errorMessage(error, "Market sync enqueue failed");
        const result = {
          stage: "enqueue"
        };
        await this.syncJobRunsRepository.markFailed({
          completedAt: new Date(),
          failureReason,
          id: run.id,
          result
        });
        await this.recordMarketSyncFailed({
          failureReason,
          result,
          syncJobRunId: run.id,
          userId: operator.userId ?? null
        });
      }

      throw new ConflictException("Market sync job could not be enqueued");
    }
  }

  async listJobs(
    operator: SyncJobsOperator,
    input: Pick<ListSyncJobRunsInput, "type"> = {}
  ): Promise<SyncJobRunRecord[]> {
    this.requireAdmin(operator);

    return this.syncJobRunsRepository.listRecent({
      limit: 20,
      type: input.type
    });
  }

  async getJob(operator: SyncJobsOperator, id: string): Promise<SyncJobRunRecord> {
    this.requireAdmin(operator);

    const run = await this.syncJobRunsRepository.findById(id);
    if (!run) {
      throw new NotFoundException("Sync job run not found");
    }

    return run;
  }

  async processMarketSyncJob(syncJobRunId: string): Promise<SyncJobRunRecord> {
    const runningRun = await this.syncJobRunsRepository.markRunning({
      id: syncJobRunId,
      startedAt: new Date()
    });
    if (!runningRun) {
      return this.findExistingRunOrThrow(syncJobRunId);
    }

    try {
      const result = (await this.marketsService.syncActiveMarkets({
        role: "ADMIN"
      })) as MarketSyncResult;
      const resultRecord = { ...result };

      if (result.error) {
        return this.markMarketSyncFailed(syncJobRunId, result.error, resultRecord);
      }

      const run = await this.syncJobRunsRepository.markSucceeded({
        completedAt: new Date(),
        id: syncJobRunId,
        result: resultRecord
      });
      if (!run) {
        return this.findExistingRunOrThrow(syncJobRunId);
      }

      await this.auditLogService.record({
        action: "sync.market.completed",
        metadata: {
          result: resultRecord,
          syncJobRunId,
          type: "MARKET_SYNC"
        },
        userId: null
      });

      return run;
    } catch (error) {
      return this.markMarketSyncFailed(
        syncJobRunId,
        this.errorMessage(error, "Market sync failed")
      );
    }
  }

  private async markMarketSyncFailed(
    syncJobRunId: string,
    failureReason: string,
    result?: Record<string, unknown>
  ): Promise<SyncJobRunRecord> {
    const run = await this.syncJobRunsRepository.markFailed({
      completedAt: new Date(),
      failureReason,
      id: syncJobRunId,
      ...(result ? { result } : {})
    });
    if (!run) {
      return this.findExistingRunOrThrow(syncJobRunId);
    }

    await this.recordMarketSyncFailed({
      failureReason,
      result,
      syncJobRunId,
      userId: null
    });

    return run;
  }

  private async findExistingRunOrThrow(syncJobRunId: string): Promise<SyncJobRunRecord> {
    const run = await this.syncJobRunsRepository.findById(syncJobRunId);
    if (!run) {
      throw new NotFoundException("Sync job run not found");
    }

    return run;
  }

  private async recordMarketSyncFailed(input: {
    failureReason: string;
    result?: Record<string, unknown>;
    syncJobRunId: string;
    userId: string | null;
  }): Promise<void> {
    await this.auditLogService.record({
      action: "sync.market.failed",
      metadata: {
        failureReason: input.failureReason,
        ...(input.result ? { result: input.result } : {}),
        syncJobRunId: input.syncJobRunId,
        type: "MARKET_SYNC"
      },
      userId: input.userId
    });
  }

  private requireAdmin(operator: SyncJobsOperator) {
    if (operator.role !== "ADMIN") {
      throw new ForbiddenException("Admin role is required");
    }
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    );
  }
}

export type { SyncJobRunType };
