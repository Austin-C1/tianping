import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import {
  AdminGateDto,
  AdminSummaryDto,
  OrderRouterEnvironmentDto
} from "../openapi/api-contract.dto";
import { LiveApprovalReasonDto } from "./dto/live-approval.dto";
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

  @Get("audit")
  getAuditLogs(@Req() request: AuthenticatedRequest) {
    return this.adminService.getAuditLogs(request.user);
  }

  @Get("risk/gates")
  getRiskGateReport(@Req() request: AuthenticatedRequest) {
    return this.adminService.getRiskGateReport(request.user);
  }

  @Get("live-approval")
  getLiveApproval(@Req() request: AuthenticatedRequest) {
    return this.adminService.getLiveApproval(request.user);
  }

  @Post("live-approval/approve")
  approveLiveTrading(
    @Body() dto: LiveApprovalReasonDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.adminService.approveLiveTrading(request.user, dto);
  }

  @Post("live-approval/revoke")
  revokeLiveTrading(
    @Body() dto: LiveApprovalReasonDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.adminService.revokeLiveTrading(request.user, dto);
  }

  @Get("environment")
  @ApiOkResponse({ type: OrderRouterEnvironmentDto })
  getEnvironment(@Req() request: AuthenticatedRequest) {
    return this.adminService.getEnvironment(request.user);
  }
}
