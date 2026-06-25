import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrderRouterModule } from "../order-router/order-router.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule, OrderRouterModule, PrismaModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
