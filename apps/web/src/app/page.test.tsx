import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../features/i18n/language-provider";
import { listMarkets } from "../features/markets/markets-actions";
import Home from "./page";

vi.mock("../features/markets/markets-actions", () => ({
  listMarkets: vi.fn()
}));

const listMarketsMock = vi.mocked(listMarkets);

describe("Home", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("pmx.locale", "en");
    listMarketsMock.mockReset();
    listMarketsMock.mockResolvedValue([]);
  });

  it("shows the product trading workspace", () => {
    renderHome();

    expect(screen.getByRole("heading", { name: "Markets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Market groups" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top markets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trade readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Order preview" })).toBeInTheDocument();
    expect(screen.getByText("Wallet not connected")).toBeInTheDocument();
    expect(screen.getByText("Deposit Wallet not created")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual approval Gate" })).toBeDisabled();
  });

  it("links market cards and outcome prices to the market detail page", async () => {
    listMarketsMock.mockResolvedValue([
      market({
        marketId: "market_1",
        outcomePrices: ["0.01", "0.99"],
        outcomes: ["Colombia", "DR Congo"],
        question: "Spread: Colombia (-5.5)"
      })
    ]);

    renderHome();

    expect(await screen.findByRole("link", { name: "Spread: Colombia (-5.5)" })).toHaveAttribute(
      "href",
      "/markets/market_1"
    );
    expect(screen.getByRole("link", { name: "Colombia 1c" })).toHaveAttribute(
      "href",
      "/markets/market_1?side=yes"
    );
    expect(screen.getByRole("link", { name: "DR Congo 99c" })).toHaveAttribute(
      "href",
      "/markets/market_1?side=no"
    );
  });

  it("groups the default market view by category and keeps category drilldown complete", async () => {
    listMarketsMock.mockResolvedValue(
      Array.from({ length: 7 }, (_, index) =>
        market({
          id: `snapshot_${index + 1}`,
          marketId: `market_${index + 1}`,
          question: `Sports market ${index + 1}?`
        })
      )
    );

    renderHome();

    expect(await screen.findByRole("heading", { name: "Sports" })).toBeInTheDocument();
    expect(screen.getByText("7 markets, showing 4")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sports market 7?" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sports/ }));

    expect(await screen.findByRole("link", { name: "Sports market 7?" })).toHaveAttribute(
      "href",
      "/markets/market_7"
    );
  });

  it("refreshes the public market list from the homepage button", async () => {
    listMarketsMock
      .mockResolvedValueOnce([market({ question: "Initial market?" })])
      .mockResolvedValueOnce([market({ id: "snapshot_2", marketId: "market_2", question: "Refreshed market?" })]);

    renderHome();

    expect(await screen.findByRole("link", { name: "Initial market?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh market list" }));

    expect(await screen.findByRole("link", { name: "Refreshed market?" })).toBeInTheDocument();
    expect(listMarketsMock).toHaveBeenCalledTimes(2);
  });

  it("uses CLOB best ask quotes before Gamma outcome prices", async () => {
    listMarketsMock.mockResolvedValue([
      market({
        outcomePrices: ["0.01", "0.99"],
        outcomes: ["Colombia", "DR Congo"],
        question: "Spread: Colombia (-5.5)",
        quotes: [
          {
            bestAsk: "0.25",
            bestBid: "0.24",
            midpoint: "0.245",
            minOrderSize: "5",
            outcome: "Colombia",
            outcomeIndex: 0,
            spread: "0.01",
            syncedAt: "2026-06-24T00:00:02.000Z",
            tickSize: "0.01",
            tokenId: "token_yes"
          }
        ]
      })
    ]);

    renderHome();

    expect(await screen.findByRole("link", { name: "Colombia 25c" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Colombia 1c" })).not.toBeInTheDocument();
  });
});

function renderHome() {
  render(
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );
}

function market(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    category: "Sports",
    closed: false,
    id: "snapshot_1",
    liquidity: "200",
    marketId: "market_1",
    outcomePrices: ["0.50", "0.50"],
    outcomes: ["Yes", "No"],
    question: "Sports market 1?",
    slug: "sports-market-1",
    syncedAt: "2026-06-24T00:00:00.000Z",
    volume: "100",
    ...overrides
  };
}
