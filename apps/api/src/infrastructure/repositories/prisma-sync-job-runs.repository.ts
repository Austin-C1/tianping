import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  AttachSyncJobQueueInput,
  CreateSyncJobRunInput,
  ListSyncJobRunsInput,
  MarkSyncJobFailedInput,
  MarkSyncJobRunningInput,
  MarkSyncJobSucceededInput,
  SyncJobRunRecord,
  SyncJobRunsRepository,
  SyncJobRunType
} from "./repository.types";

const ACTIVE_SYNC_JOB_STATUSES = ["QUEUED", "RUNNING"] as const;

@Injectable()
export class PrismaSyncJobRunsRepository implements SyncJobRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateSyncJobRunInput): Promise<SyncJobRunRecord> {
    return this.prisma.syncJobRun.create({
      data: {
        metadata: input.metadata ? this.inputJson(input.metadata) : undefined,
        requestedById: input.requestedById,
        status: "QUEUED",
        type: input.type
      }
    });
  }

  attachQueueJob(input: AttachSyncJobQueueInput): Promise<SyncJobRunRecord> {
    return this.prisma.syncJobRun.update({
      data: {
        queueJobId: input.queueJobId
      },
      where: { id: input.id }
    });
  }

  findActiveByType(type: SyncJobRunType): Promise<SyncJobRunRecord | null> {
    return this.prisma.syncJobRun.findFirst({
      orderBy: { createdAt: "asc" },
      where: {
        status: { in: [...ACTIVE_SYNC_JOB_STATUSES] },
        type
      }
    });
  }

  findById(id: string): Promise<SyncJobRunRecord | null> {
    return this.prisma.syncJobRun.findUnique({
      where: { id }
    });
  }

  listRecent(input: ListSyncJobRunsInput = {}): Promise<SyncJobRunRecord[]> {
    return this.prisma.syncJobRun.findMany({
      orderBy: { createdAt: "desc" },
      take: input.limit ?? 20,
      where: input.type ? { type: input.type } : undefined
    });
  }

  async markRunning(input: MarkSyncJobRunningInput): Promise<SyncJobRunRecord | null> {
    const updated = await this.prisma.syncJobRun.updateMany({
      data: {
        startedAt: input.startedAt,
        status: "RUNNING"
      },
      where: { id: input.id, status: "QUEUED" }
    });

    return updated.count > 0 ? this.findById(input.id) : null;
  }

  async markSucceeded(input: MarkSyncJobSucceededInput): Promise<SyncJobRunRecord | null> {
    const updated = await this.prisma.syncJobRun.updateMany({
      data: {
        completedAt: input.completedAt,
        result: this.inputJson(input.result),
        status: "SUCCEEDED"
      },
      where: { id: input.id, status: "RUNNING" }
    });

    return updated.count > 0 ? this.findById(input.id) : null;
  }

  async markFailed(input: MarkSyncJobFailedInput): Promise<SyncJobRunRecord | null> {
    const updated = await this.prisma.syncJobRun.updateMany({
      data: {
        completedAt: input.completedAt,
        failureReason: input.failureReason,
        result: input.result ? this.inputJson(input.result) : undefined,
        status: "FAILED"
      },
      where: { id: input.id, status: { in: [...ACTIVE_SYNC_JOB_STATUSES] } }
    });

    return updated.count > 0 ? this.findById(input.id) : null;
  }

  private inputJson(value: object): Prisma.InputJsonObject {
    return value as unknown as Prisma.InputJsonObject;
  }
}
