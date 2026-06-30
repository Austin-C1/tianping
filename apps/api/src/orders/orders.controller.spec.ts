import { OrdersController } from "./orders.controller";

describe("OrdersController", () => {
  const createService = () => ({
    createSigningIntent: jest.fn().mockResolvedValue({ id: "order_1" }),
    getOrder: jest.fn().mockResolvedValue({ id: "order_1" }),
    listOrders: jest.fn().mockResolvedValue([]),
    previewOrder: jest.fn().mockResolvedValue({ id: "order_1" }),
    saveSignedOrder: jest.fn().mockResolvedValue({ id: "order_1" }),
    submitOrder: jest.fn().mockResolvedValue({ id: "order_1" })
  });
  const request = {
    user: {
      email: "person@example.com",
      role: "USER" as const,
      userId: "user_1"
    }
  };

  it("routes preview requests to the order service", async () => {
    const service = createService();
    const controller = new OrdersController(service as never);
    const dto = { amountUsd: 10, marketId: "market_1", outcomeIndex: 0 };

    await expect(controller.preview(dto, request as never)).resolves.toEqual({ id: "order_1" });
    expect(service.previewOrder).toHaveBeenCalledWith(dto, request.user);
  });

  it("routes signing, signed, and submit requests to the order service", async () => {
    const service = createService();
    const controller = new OrdersController(service as never);

    await expect(
      controller.createSigningIntent({ orderId: "order_1" }, request as never)
    ).resolves.toEqual({ id: "order_1" });
    await expect(
      controller.saveSignedOrder(
        { orderId: "order_1", signedPayload: { signature: "0xsig" } },
        request as never
      )
    ).resolves.toEqual({ id: "order_1" });
    await expect(controller.submitOrder({ orderId: "order_1" }, request as never)).resolves.toEqual({
      id: "order_1"
    });

    expect(service.createSigningIntent).toHaveBeenCalledWith({ orderId: "order_1" }, request.user);
    expect(service.saveSignedOrder).toHaveBeenCalledWith(
      { orderId: "order_1", signedPayload: { signature: "0xsig" } },
      request.user
    );
    expect(service.submitOrder).toHaveBeenCalledWith({ orderId: "order_1" }, request.user);
  });

  it("routes list and detail reads to the order service", async () => {
    const service = createService();
    const controller = new OrdersController(service as never);

    await expect(controller.listOrders(request as never)).resolves.toEqual([]);
    await expect(controller.getOrder("order_1", request as never)).resolves.toEqual({ id: "order_1" });

    expect(service.listOrders).toHaveBeenCalledWith(request.user);
    expect(service.getOrder).toHaveBeenCalledWith("order_1", request.user);
  });
});
