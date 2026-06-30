import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MarketProviderModule } from "../infrastructure/market-providers/market-provider.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MarketsController } from "./markets.controller";
import { MarketsService } from "./markets.service";

@Module({
  imports: [AuthModule, MarketProviderModule, PrismaModule],
  controllers: [MarketsController],
  providers: [MarketsService]
})
export class MarketsModule {}
