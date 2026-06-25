import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { PreviewOrderDto } from "./dto/preview-order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("preview")
  preview(@Body() dto: PreviewOrderDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.previewOrder(dto, request.user);
  }
}
