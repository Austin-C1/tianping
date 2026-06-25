import { describe, expect, it } from "vitest";
import { calculateOrderPreview, parseOrderAmount } from "./order-calculator";

describe("calculateOrderPreview", () => {
  it("calculates shares, payout, and profit from amount and price", () => {
    expect(calculateOrderPreview({ amountUsd: 10, price: 0.25 })).toEqual({
      amountUsd: 10,
      price: 0.25,
      shares: 40,
      estimatedPayout: 40,
      estimatedProfit: 30
    });
  });

  it("returns zero preview values when price or amount is invalid", () => {
    expect(calculateOrderPreview({ amountUsd: 10, price: 0 })).toEqual({
      amountUsd: 10,
      price: 0,
      shares: 0,
      estimatedPayout: 0,
      estimatedProfit: 0
    });

    expect(calculateOrderPreview({ amountUsd: Number.NaN, price: 0.25 })).toEqual({
      amountUsd: 0,
      price: 0.25,
      shares: 0,
      estimatedPayout: 0,
      estimatedProfit: 0
    });
  });

  it("calculates even-money previews at a price of 1", () => {
    expect(calculateOrderPreview({ amountUsd: 10, price: 1 })).toEqual({
      amountUsd: 10,
      price: 1,
      shares: 10,
      estimatedPayout: 10,
      estimatedProfit: 0
    });
  });

  it("parses currency-style amount input", () => {
    expect(parseOrderAmount("$10")).toBe(10);
    expect(parseOrderAmount("1,250.50")).toBe(1250.5);
    expect(parseOrderAmount("not money")).toBeNaN();
    expect(parseOrderAmount("0x10")).toBeNaN();
    expect(parseOrderAmount("1e3")).toBeNaN();
    expect(parseOrderAmount("1,2,3")).toBeNaN();
  });
});
