import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { ManagedUserDto } from "../openapi/api-contract.dto";
import { UsersService } from "./users.service";

@Controller("admin/users")
@UseGuards(AuthGuard)
@ApiTags("admin")
@ApiBearerAuth("bearer")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: [ManagedUserDto] })
  list(@Req() request: AuthenticatedRequest) {
    return this.usersService.listUsers(request.user);
  }
}
