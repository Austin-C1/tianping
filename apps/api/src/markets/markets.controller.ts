import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { MarketListItemDto, MarketSyncResultDto } from "../openapi/api-contract.dto";
import { MarketsService } from "./markets.service";

@Controller()
@ApiTags("markets")
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get("markets")
  @ApiOkResponse({ type: [MarketListItemDto] })
  listMarkets() {
    return this.marketsService.listMarkets();
  }

  @Get("markets/:id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: MarketListItemDto })
  getMarket(@Param("id") id: string) {
    return this.marketsService.getMarket(id);
  }

  @Post("admin/markets/sync")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("bearer")
  @ApiCreatedResponse({ type: MarketSyncResultDto })
  syncMarkets(@Req() request: AuthenticatedRequest) {
    return this.marketsService.syncActiveMarkets(request.user);
  }
}
