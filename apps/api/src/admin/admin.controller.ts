import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import {
  AdminGateDto,
  AdminSummaryDto,
  OrderRouterEnvironmentDto
} from "../openapi/api-contract.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(AuthGuard)
@ApiTags("admin")
@ApiBearerAuth("bearer")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("summary")
  @ApiOkResponse({ type: AdminSummaryDto })
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.adminService.getSummary(request.user);
  }

  @Get("gates")
  @ApiOkResponse({ type: [AdminGateDto] })
  getGates(@Req() request: AuthenticatedRequest) {
    return this.adminService.getGates(request.user);
  }

  @Get("environment")
  @ApiOkResponse({ type: OrderRouterEnvironmentDto })
  getEnvironment(@Req() request: AuthenticatedRequest) {
    return this.adminService.getEnvironment(request.user);
  }
}
