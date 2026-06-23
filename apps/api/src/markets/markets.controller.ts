import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { MarketsService } from "./markets.service";

@Controller()
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get("markets")
  listMarkets() {
    return this.marketsService.listMarkets();
  }

  @Get("markets/:id")
  getMarket(@Param("id") id: string) {
    return this.marketsService.getMarket(id);
  }

  @Post("admin/markets/sync")
  @UseGuards(AuthGuard)
  syncMarkets(@Req() request: AuthenticatedRequest) {
    return this.marketsService.syncActiveMarkets(request.user);
  }
}
