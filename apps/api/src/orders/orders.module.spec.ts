import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { OrdersModule } from "./orders.module";
import { OrdersService } from "./orders.service";

describe("OrdersModule", () => {
  it("wires the authenticated orders controller dependencies", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true
        }),
        OrdersModule
      ]
    }).compile();

    expect(moduleRef.get(OrdersService)).toBeInstanceOf(OrdersService);
  });
});
