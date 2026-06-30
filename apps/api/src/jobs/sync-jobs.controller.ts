import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { SyncJobRunDto } from "../openapi/api-contract.dto";
import { SyncJobsService } from "./sync-jobs.service";

@Controller("admin/sync")
@UseGuards(AuthGuard)
@ApiTags("admin-sync")
@ApiBearerAuth("bearer")
export class SyncJobsController {
  constructor(private readonly syncJobsService: SyncJobsService) {}

  @Post("market")
  @ApiCreatedResponse({ type: SyncJobRunDto })
  enqueueMarketSync(@Req() request: AuthenticatedRequest) {
    return this.syncJobsService.enqueueMarketSync(request.user);
  }

  @Get("jobs")
  @ApiOkResponse({ type: [SyncJobRunDto] })
  listJobs(@Req() request: AuthenticatedRequest) {
    return this.syncJobsService.listJobs(request.user);
  }

  @Get("jobs/:id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: SyncJobRunDto })
  getJob(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.syncJobsService.getJob(request.user, id);
  }
}
