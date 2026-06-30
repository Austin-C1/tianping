import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { PreviewOrderResponseDto } from "../openapi/api-contract.dto";
import { OrderIdDto, SaveSignedOrderDto } from "./dto/order-lifecycle.dto";
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

  @Post("signing-intent")
  createSigningIntent(@Body() dto: OrderIdDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.createSigningIntent(dto, request.user);
  }

  @Post("signed")
  saveSignedOrder(@Body() dto: SaveSignedOrderDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.saveSignedOrder(dto, request.user);
  }

  @Post("submit")
  submitOrder(@Body() dto: OrderIdDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.submitOrder(dto, request.user);
  }

  @Get()
  listOrders(@Req() request: AuthenticatedRequest) {
    return this.ordersService.listOrders(request.user);
  }

  @Get(":id")
  getOrder(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.ordersService.getOrder(id, request.user);
  }
}
