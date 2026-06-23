import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("summary")
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.adminService.getSummary(request.user);
  }

  @Get("gates")
  getGates(@Req() request: AuthenticatedRequest) {
    return this.adminService.getGates(request.user);
  }
}
