import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Polymarket CLOB SDK boundary", () => {
  it("keeps order business code behind the local adapter boundary", () => {
    const ordersService = readFileSync(join(process.cwd(), "src/orders/orders.service.ts"), "utf8");

    expect(ordersService).not.toContain("@polymarket/clob-client-v2");
  });
});
