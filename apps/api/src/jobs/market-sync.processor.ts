import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { QUEUE_NAMES } from "./queue-names";
import { type MarketSyncJobData, SyncJobsService } from "./sync-jobs.service";

@Processor(QUEUE_NAMES.marketSync)
export class MarketSyncProcessor extends WorkerHost {
  constructor(private readonly syncJobsService: SyncJobsService) {
    super();
  }

  process(job: Job<MarketSyncJobData>) {
    return this.syncJobsService.processMarketSyncJob(job.data.syncJobRunId);
  }
}
