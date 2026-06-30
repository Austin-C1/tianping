import { PolymarketMarketProvider } from "./polymarket.provider";

describe("PolymarketMarketProvider", () => {
  it("delegates active market and order book reads to the Polymarket client", async () => {
    const client = {
      fetchActiveMarkets: jest.fn().mockResolvedValue([{ id: "market_1" }]),
      fetchOrderBooks: jest.fn().mockResolvedValue([{ asset_id: "token_yes" }])
    };
    const provider = new PolymarketMarketProvider(client as never);

    await expect(provider.listActiveMarkets()).resolves.toEqual([{ id: "market_1" }]);
    await expect(provider.getOrderBooks(["token_yes"])).resolves.toEqual([
      { asset_id: "token_yes" }
    ]);
    expect(provider.providerId).toBe("polymarket");
    expect(client.fetchActiveMarkets).toHaveBeenCalledWith();
    expect(client.fetchOrderBooks).toHaveBeenCalledWith(["token_yes"]);
  });
});
