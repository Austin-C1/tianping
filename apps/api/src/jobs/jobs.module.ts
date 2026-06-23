import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUE_NAMES } from "./queue-names";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.marketSync },
      { name: QUEUE_NAMES.orderStatusSync },
      { name: QUEUE_NAMES.tradeSync },
      { name: QUEUE_NAMES.positionSync },
      { name: QUEUE_NAMES.auditLog }
    )
  ],
  exports: [BullModule]
})
export class JobsModule {}
