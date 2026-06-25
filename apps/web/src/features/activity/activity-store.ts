export interface ActivityItem {
  id: string;
  type: "market.viewed" | "order.previewed";
  label: string;
  description?: string;
  orderPreview?: OrderPreviewActivityDetails;
  createdAt: string;
}

export interface OrderPreviewActivityDetails {
  amountUsd: number;
  outcome: string;
  price: number;
}

interface OrderPreviewActivityInput extends OrderPreviewActivityDetails {
  marketTitle: string;
}

const ACTIVITY_KEY = "pmx.activity";

export function readActivity(): ActivityItem[] {
  const rawValue = window.localStorage.getItem(ACTIVITY_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isActivityItem);
  } catch {
    return [];
  }
}

export function appendActivity(item: Omit<ActivityItem, "id" | "createdAt">): ActivityItem {
  const nextItem: ActivityItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  const nextItems = [nextItem, ...readActivity()].slice(0, 20);

  window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(nextItems));

  return nextItem;
}

export function appendOrderPreviewActivity(input: OrderPreviewActivityInput): ActivityItem {
  const description = `Buy ${input.outcome} ${formatCents(input.price)} / ${formatUsd(input.amountUsd)}`;
  const latestItem = readActivity()[0];

  if (
    latestItem?.type === "order.previewed" &&
    latestItem.label === input.marketTitle &&
    latestItem.description === description
  ) {
    return latestItem;
  }

  return appendActivity({
    type: "order.previewed",
    label: input.marketTitle,
    description,
    orderPreview: {
      amountUsd: input.amountUsd,
      outcome: input.outcome,
      price: input.price
    }
  });
}

function isActivityItem(value: unknown): value is ActivityItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    (item.type === "market.viewed" || item.type === "order.previewed") &&
    typeof item.label === "string" &&
    (typeof item.description === "string" || item.description === undefined) &&
    (isOrderPreviewDetails(item.orderPreview) || item.orderPreview === undefined) &&
    typeof item.createdAt === "string"
  );
}

function isOrderPreviewDetails(value: unknown): value is OrderPreviewActivityDetails {
  if (!value || typeof value !== "object") {
    return false;
  }

  const preview = value as Record<string, unknown>;

  return (
    typeof preview.amountUsd === "number" &&
    typeof preview.outcome === "string" &&
    typeof preview.price === "number"
  );
}

function formatCents(price: number): string {
  if (!Number.isFinite(price)) {
    return "--";
  }

  return `${Math.round(price * 100)}c`;
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "$0.00";
  }

  return `$${value.toFixed(2)}`;
}
