import { toClobOrderDraft } from "./order-domain";

describe("order-domain", () => {
  it("builds a Polymarket CLOB V2 order draft without deprecated V1-only fields", () => {
    const draft = toClobOrderDraft({
      amountUsd: 10,
      builderCode: `0x${"1".repeat(64)}`,
      funderAddress: "0x1111111111111111111111111111111111111111",
      negRisk: true,
      orderType: "FAK",
      side: "BUY",
      tickSize: "0.01",
      tokenID: "token_yes"
    });

    expect(draft).toEqual({
      amount: 10,
      builderCode: `0x${"1".repeat(64)}`,
      funderAddress: "0x1111111111111111111111111111111111111111",
      negRisk: true,
      orderType: "FAK",
      side: "BUY",
      signatureType: "POLY_1271",
      tickSize: "0.01",
      tokenID: "token_yes"
    });
    expect(draft).not.toHaveProperty("feeRateBps");
    expect(draft).not.toHaveProperty("nonce");
    expect(draft).not.toHaveProperty("taker");
  });

  it("rejects unsupported CLOB tick sizes", () => {
    expect(() =>
      toClobOrderDraft({
        amountUsd: 10,
        builderCode: null,
        funderAddress: null,
        negRisk: false,
        orderType: "FAK",
        side: "BUY",
        tickSize: "0.005",
        tokenID: "token_yes"
      })
    ).toThrow("Unsupported CLOB tick size");
  });
});
