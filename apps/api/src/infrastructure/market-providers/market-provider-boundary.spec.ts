import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("MarketProvider boundary", () => {
  it("keeps MarketsService behind the MarketProvider interface", () => {
    const serviceSource = readFileSync(
      join(__dirname, "../../markets/markets.service.ts"),
      "utf8"
    );

    expect(serviceSource).not.toContain("./polymarket.client");
    expect(serviceSource).toContain("MARKET_PROVIDER");
  });
});
