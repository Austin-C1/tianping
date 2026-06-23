import { MarketDetailPage } from "../../../features/markets/market-detail-page";
import type { OrderSide } from "../../../features/trading/order-ticket";

interface PageProps {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<{ side?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { marketId } = await params;
  const { side } = await searchParams;

  return (
    <MarketDetailPage
      initialMarketId={decodeURIComponent(marketId)}
      initialSide={side === "no" ? "no" : ("yes" satisfies OrderSide)}
    />
  );
}
