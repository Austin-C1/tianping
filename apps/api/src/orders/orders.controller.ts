import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { PreviewOrderResponseDto } from "../openapi/api-contract.dto";
import { PreviewOrderDto } from "./dto/preview-order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(AuthGuard)
@ApiTags("orders")
@ApiBearerAuth("bearer")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("preview")
  @ApiCreatedResponse({ type: PreviewOrderResponseDto })
  preview(@Body() dto: PreviewOrderDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.previewOrder(dto, request.user);
  }
}
