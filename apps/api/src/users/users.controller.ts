import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { UsersService } from "./users.service";

@Controller("admin/users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.usersService.listUsers(request.user);
  }
}
