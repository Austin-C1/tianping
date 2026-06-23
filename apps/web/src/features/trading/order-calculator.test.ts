import { describe, expect, it } from "vitest";
import { calculateOrderPreview } from "./order-calculator";

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
  });
});
