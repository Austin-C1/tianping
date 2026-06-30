import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/language-provider";
import {
  createSigningIntent,
  previewOrder,
  saveSignedOrder,
  submitOrder
} from "../trading/order-preview-client";
import { MarketDetailPage } from "./market-detail-page";
import { fetchMarkets } from "./markets-client";

vi.mock("next/navigation", () => ({
  usePathname: () => "/markets/market_1",
  useRouter: () => ({ replace: vi.fn() })
}));

vi.mock("./markets-client", () => ({
  fetchMarkets: vi.fn()
}));

vi.mock("../trading/order-preview-client", () => ({
  createSigningIntent: vi.fn(),
  previewOrder: vi.fn(),
  saveSignedOrder: vi.fn(),
  submitOrder: vi.fn()
}));

const createSigningIntentMock = vi.mocked(createSigningIntent);
const fetchMarketsMock = vi.mocked(fetchMarkets);
const previewOrderMock = vi.mocked(previewOrder);
const saveSignedOrderMock = vi.mocked(saveSignedOrder);
const submitOrderMock = vi.mocked(submitOrder);

describe("MarketDetailPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("pmx.locale", "en");
    createSigningIntentMock.mockReset();
    fetchMarketsMock.mockReset();
    previewOrderMock.mockReset();
    saveSignedOrderMock.mockReset();
    submitOrderMock.mockReset();
    fetchMarketsMock.mockResolvedValue([
      {
        id: "snapshot_1",
        marketId: "market_1",
        slug: "spread-colombia-dr-congo",
        question: "Spread: Colombia (-5.5)",
        category: "Sports",
        active: true,
        closed: false,
        outcomes: ["Colombia", "DR Congo"],
        outcomePrices: ["0.25", "0.75"],
        volume: "746",
        liquidity: "16729",
        syncedAt: "2026-06-24T00:00:00.000Z"
      }
    ]);
    previewOrderMock.mockResolvedValue({
      id: "order_1",
      readiness: {
        canPreview: true,
        canSign: true,
        gates: []
      },
      submitDisabled: true
    });
    createSigningIntentMock.mockResolvedValue({
      id: "order_1",
      signingPayload: { tokenID: "token_yes", amount: 10 },
      status: "SIGNING_REQUESTED"
    });
    saveSignedOrderMock.mockResolvedValue({
      id: "order_1",
      signedPayload: { signature: "paper-signature-order_1" },
      status: "SIGNED"
    });
    submitOrderMock.mockResolvedValue({
      clobOrderId: "paper_order_1",
      createdAt: "2026-06-30T00:00:00.000Z",
      failureReason: null,
      id: "order_1",
      market: { marketId: "market_1", question: "Spread: Colombia (-5.5)" },
      outcome: "Colombia",
      price: "0.25",
      size: "40",
      status: "SUBMITTED",
      submittedAt: "2026-06-30T00:01:00.000Z",
      updatedAt: "2026-06-30T00:01:00.000Z"
    });
  });

  it("submits a previewed order through the paper lifecycle", async () => {
    renderMarketDetail();

    expect(await screen.findByRole("heading", { name: "Spread: Colombia (-5.5)" })).toBeInTheDocument();
    await waitFor(() =>
      expect(previewOrderMock).toHaveBeenCalledWith({
        amountUsd: 10,
        marketId: "market_1",
        outcomeIndex: 0,
        orderType: "FAK"
      })
    );

    const paperButton = await screen.findByRole("button", { name: "Submit paper order" });
    expect(paperButton).toBeEnabled();

    fireEvent.click(paperButton);

    await waitFor(() => expect(createSigningIntentMock).toHaveBeenCalledWith({ orderId: "order_1" }));
    expect(saveSignedOrderMock).toHaveBeenCalledWith({
      orderId: "order_1",
      signedPayload: {
        mode: "paper",
        signature: "paper-signature-order_1",
        signingPayload: { tokenID: "token_yes", amount: 10 }
      }
    });
    expect(submitOrderMock).toHaveBeenCalledWith({ orderId: "order_1" });
    expect(await screen.findByText("Submitted as paper_order_1")).toBeInTheDocument();
  });
});

function renderMarketDetail() {
  render(
    <LanguageProvider>
      <MarketDetailPage initialMarketId="market_1" />
    </LanguageProvider>
  );
}
