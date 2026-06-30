import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../features/i18n/language-provider";
import { emptyPortfolio, loadPortfolio } from "../../features/portfolio/portfolio-actions";
import PortfolioPage from "./page";

vi.mock("../../features/portfolio/portfolio-actions", () => ({
  emptyPortfolio: {
    positions: [],
    summary: {
      positionCount: 0,
      tradeCount: 0
    },
    trades: []
  },
  loadPortfolio: vi.fn()
}));

const loadPortfolioMock = vi.mocked(loadPortfolio);

describe("PortfolioPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("pmx.locale", "en");
    loadPortfolioMock.mockReset();
  });

  it("shows paper positions and recent paper trades", async () => {
    loadPortfolioMock.mockResolvedValue({
      positions: [
        {
          averagePrice: "0.5",
          id: "position_1",
          market: { marketId: "market_1", question: "Question?" },
          outcome: "Yes",
          size: "20",
          updatedAt: "2026-06-30T00:00:00.000Z"
        }
      ],
      summary: { positionCount: 1, tradeCount: 1 },
      trades: [
        {
          clobTradeId: "paper_order_1:fill",
          executedAt: "2026-06-30T00:01:00.000Z",
          id: "trade_1",
          market: { marketId: "market_1", question: "Question?" },
          orderId: "order_1",
          price: "0.5",
          side: "BUY",
          size: "20"
        }
      ]
    });

    renderPortfolio();

    expect(await screen.findAllByText("Question?")).toHaveLength(2);
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("20 shares")).toBeInTheDocument();
    expect(screen.getByText("50c avg")).toBeInTheDocument();
    expect(screen.getByText("Buy 20 @ 50c")).toBeInTheDocument();
    expect(screen.getByText("paper_order_1:fill")).toBeInTheDocument();
  });

  it("keeps the empty portfolio state when there are no paper rows", async () => {
    loadPortfolioMock.mockResolvedValue(emptyPortfolio);

    renderPortfolio();

    expect(await screen.findByText("No positions yet")).toBeInTheDocument();
    expect(screen.getByText("No paper trades yet")).toBeInTheDocument();
  });
});

function renderPortfolio() {
  render(
    <LanguageProvider>
      <PortfolioPage />
    </LanguageProvider>
  );
}
