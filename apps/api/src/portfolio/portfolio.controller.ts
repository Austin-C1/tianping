import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
@UseGuards(AuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolio(@Req() request: AuthenticatedRequest) {
    return this.portfolioService.getPortfolio(request.user);
  }
}
