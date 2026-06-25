import { Module } from "@nestjs/common";
import { OrderRouterConfigService } from "./order-router.config";

@Module({
  providers: [OrderRouterConfigService],
  exports: [OrderRouterConfigService]
})
export class OrderRouterModule {}
