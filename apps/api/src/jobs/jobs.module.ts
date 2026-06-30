import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { RepositoriesModule } from "../infrastructure/repositories/repositories.module";
import { MarketsModule } from "../markets/markets.module";
import { MarketSyncProcessor } from "./market-sync.processor";
import { QUEUE_NAMES } from "./queue-names";
import { SyncJobsController } from "./sync-jobs.controller";
import { SyncJobsService } from "./sync-jobs.service";

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.marketSync },
      { name: QUEUE_NAMES.orderStatusSync },
      { name: QUEUE_NAMES.tradeSync },
      { name: QUEUE_NAMES.positionSync },
      { name: QUEUE_NAMES.auditLog }
    ),
    ComplianceModule,
    MarketsModule,
    RepositoriesModule
  ],
  controllers: [SyncJobsController],
  providers: [MarketSyncProcessor, SyncJobsService],
  exports: [BullModule]
})
export class JobsModule {}
