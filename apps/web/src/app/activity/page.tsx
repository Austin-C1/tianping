"use client";

import { useEffect, useState } from "react";
import { readActivity, type ActivityItem } from "../../features/activity/activity-store";
import { useLanguage } from "../../features/i18n/language-provider";
import { WebTopbar } from "../../features/layout/web-topbar";

const copy = {
  "zh-CN": {
    empty: "暂无活动。打开市场详情或调整订单票据后会在这里显示。",
    eyebrow: "操作记录",
    marketViewed: "查看市场",
    orderPreviewed: "订单预览",
    title: "活动"
  },
  en: {
    empty: "No activity yet. Market detail views and order preview changes will appear here.",
    eyebrow: "Activity log",
    marketViewed: "Market viewed",
    orderPreviewed: "Order previewed",
    title: "Activity"
  }
} as const;

export default function ActivityPage() {
  const { locale } = useLanguage();
  const text = copy[locale];
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    setItems(readActivity());
  }, []);

  return (
    <main>
      <WebTopbar />
      <div className="shell portfolio-shell">
        <div className="eyebrow">{text.eyebrow}</div>
        <h1>{text.title}</h1>

        <section className="panel activity-list">
          {items.length === 0 ? (
            <p>{text.empty}</p>
          ) : (
            items.map((item) => (
              <article key={item.id}>
                <span>{item.type === "market.viewed" ? text.marketViewed : text.orderPreviewed}</span>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
