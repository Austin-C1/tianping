import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MarketsController } from "./markets.controller";
import { MarketsService } from "./markets.service";
import { PolymarketClient } from "./polymarket.client";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MarketsController],
  providers: [MarketsService, PolymarketClient]
})
export class MarketsModule {}
