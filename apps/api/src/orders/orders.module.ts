import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RepositoriesModule } from "../infrastructure/repositories/repositories.module";
import { WalletsModule } from "../wallets/wallets.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [AuthModule, RepositoriesModule, WalletsModule],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
