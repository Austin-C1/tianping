import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WalletsModule } from "../wallets/wallets.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PaperOrderProvider } from "./paper-order-provider";

@Module({
  imports: [AuthModule, ComplianceModule, PrismaModule, WalletsModule],
  controllers: [OrdersController],
  providers: [OrdersService, PaperOrderProvider]
})
export class OrdersModule {}
