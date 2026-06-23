export interface ActivityItem {
  id: string;
  type: "market.viewed" | "order.previewed";
  label: string;
  description?: string;
  createdAt: string;
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
    typeof item.createdAt === "string"
  );
}
