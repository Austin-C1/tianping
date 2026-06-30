import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PortfolioController } from "./portfolio.controller";
import { PortfolioService } from "./portfolio.service";

@Module({
  imports: [AuthModule, ComplianceModule, PrismaModule],
  controllers: [PortfolioController],
  providers: [PortfolioService]
})
export class PortfolioModule {}
