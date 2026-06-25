import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WalletsModule } from "../wallets/wallets.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [AuthModule, PrismaModule, WalletsModule],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
