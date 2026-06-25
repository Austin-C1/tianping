export interface OrderPreviewInput {
  amountUsd: number;
  price: number;
}

export interface OrderPreview {
  amountUsd: number;
  price: number;
  shares: number;
  estimatedPayout: number;
  estimatedProfit: number;
}

export function parseOrderAmount(value: string): number {
  const normalized = value.trim().replace(/^\$/, "").replace(/,/g, "");

  if (!value.trim()) {
    return 0;
  }

  if (!/^\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value.trim())) {
    return Number.NaN;
  }

  return Number(normalized);
}

export function calculateOrderPreview(input: OrderPreviewInput): OrderPreview {
  const amountUsd = normalizeMoney(input.amountUsd);
  const price = Number(input.price);

  if (!Number.isFinite(price) || price <= 0 || price > 1 || amountUsd <= 0) {
    return {
      amountUsd,
      price: Number.isFinite(price) ? price : 0,
      shares: 0,
      estimatedPayout: 0,
      estimatedProfit: 0
    };
  }

  const shares = amountUsd / price;
  const estimatedPayout = shares;

  return {
    amountUsd,
    price,
    shares,
    estimatedPayout,
    estimatedProfit: estimatedPayout - amountUsd
  };
}

function normalizeMoney(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}
