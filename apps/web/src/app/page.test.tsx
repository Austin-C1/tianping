import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../features/i18n/language-provider";
import { fetchMarkets } from "../features/markets/markets-client";
import Home from "./page";

vi.mock("../features/markets/markets-client", () => ({
  fetchMarkets: vi.fn()
}));

const fetchMarketsMock = vi.mocked(fetchMarkets);

describe("Home", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchMarketsMock.mockReset();
    fetchMarketsMock.mockResolvedValue([]);
  });

  it("shows the product trading workspace", () => {
    renderHome();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "市场"
    );
    expect(screen.getByRole("heading", { name: "按分类浏览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "热门市场" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "交易准备" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "订单预览" })).toBeInTheDocument();
    expect(screen.getByText("钱包未连接")).toBeInTheDocument();
    expect(screen.getByText("Deposit Wallet（入金钱包）未创建")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "人工确认关口" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "刷新市场列表" })).toBeInTheDocument();
    expect(screen.queryByText("买入 Yes")).not.toBeInTheDocument();
    expect(screen.queryByText("买入 No")).not.toBeInTheDocument();
    expect(screen.queryByText("国旗轮转")).not.toBeInTheDocument();
    expect(screen.queryByText("实时投注金额")).not.toBeInTheDocument();
  });

  it("localizes fetched market copy in the Chinese workspace", async () => {
    fetchMarketsMock.mockResolvedValue([
      {
        id: "snapshot_1",
        marketId: "market_1",
        slug: "next-leader-out",
        question: "Will Ahmed al-Sharaa be the next leader out before 2027?",
        category: "Politics",
        active: true,
        closed: false,
        outcomes: ["Yes", "No"],
        outcomePrices: ["0", "1"],
        volume: null,
        liquidity: null,
        syncedAt: "2026-06-23T00:00:00.000Z"
      }
    ]);

    renderHome();

    expect(
      await screen.findAllByText("艾哈迈德·沙拉会在 2027 年前成为下一位下台的领导人吗？")
    ).toHaveLength(3);
    expect(screen.getAllByText("政治").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "是 0c" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "否 100c" })).toBeInTheDocument();
  });

  it("links market cards and outcome prices to the market detail page", async () => {
    window.localStorage.setItem("pmx.locale", "en");
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
        outcomePrices: ["0.01", "0.99"],
        volume: "746",
        liquidity: "16729",
        syncedAt: "2026-06-24T00:00:00.000Z"
      }
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
    window.localStorage.setItem("pmx.locale", "en");
    fetchMarketsMock.mockResolvedValue(
      [
        ...Array.from({ length: 7 }, (_, index) => ({
          id: `snapshot_${index + 1}`,
          marketId: `market_${index + 1}`,
          slug: `market-${index + 1}`,
          question: `Sports market ${index + 1}?`,
          category: "Sports",
          active: true,
          closed: false,
          outcomes: ["Yes", "No"],
          outcomePrices: ["0.50", "0.50"],
          volume: "100",
          liquidity: "200",
          syncedAt: "2026-06-24T00:00:00.000Z"
        })),
        {
          id: "snapshot_8",
          marketId: "market_8",
          slug: "market-8",
          question: "Will Marco Rubio enter Iran by June 30?",
          category: null,
          active: true,
          closed: false,
          outcomes: ["Yes", "No"],
          outcomePrices: ["0.50", "0.50"],
          volume: "100",
          liquidity: "200",
          syncedAt: "2026-06-24T00:00:00.000Z"
        }
      ]
    );

    renderHome();

    expect(await screen.findByRole("heading", { name: "Sports" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Politics" })).toBeInTheDocument();
    expect(screen.getByText("7 markets, showing 4")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sports market 7?" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sports/ }));

    expect(await screen.findByRole("link", { name: "Sports market 7?" })).toHaveAttribute(
      "href",
      "/markets/market_7"
    );
  }, 10_000);

  it("refreshes the public market list from the homepage button", async () => {
    window.localStorage.setItem("pmx.locale", "en");
    fetchMarketsMock
      .mockResolvedValueOnce([
        {
          id: "snapshot_1",
          marketId: "market_1",
          slug: "market-1",
          question: "Initial market?",
          category: "Sports",
          active: true,
          closed: false,
          outcomes: ["Yes", "No"],
          outcomePrices: ["0.50", "0.50"],
          volume: "100",
          liquidity: "200",
          syncedAt: "2026-06-24T00:00:00.000Z"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "snapshot_2",
          marketId: "market_2",
          slug: "market-2",
          question: "Refreshed market?",
          category: "Sports",
          active: true,
          closed: false,
          outcomes: ["Yes", "No"],
          outcomePrices: ["0.60", "0.40"],
          volume: "300",
          liquidity: "400",
          syncedAt: "2026-06-24T00:01:00.000Z"
        }
      ]);

    renderHome();

    expect(await screen.findByRole("link", { name: "Initial market?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh market list" }));

    expect(await screen.findByRole("link", { name: "Refreshed market?" })).toBeInTheDocument();
    expect(fetchMarketsMock).toHaveBeenCalledTimes(2);
  });

  it("uses CLOB best ask quotes before Gamma outcome prices", async () => {
    window.localStorage.setItem("pmx.locale", "en");
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
        outcomePrices: ["0.01", "0.99"],
        volume: "746",
        liquidity: "16729",
        syncedAt: "2026-06-24T00:00:00.000Z",
        quotes: [
          {
            outcome: "Colombia",
            outcomeIndex: 0,
            tokenId: "token_yes",
            bestBid: "0.24",
            bestAsk: "0.25",
            midpoint: "0.245",
            spread: "0.01",
            minOrderSize: "5",
            tickSize: "0.01",
            syncedAt: "2026-06-24T00:00:02.000Z"
          }
        ]
      }
    ]);

    renderHome();

    expect(await screen.findByRole("link", { name: "Colombia 25c" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Colombia 1c" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Last sync: Jun 24, 2026, 12:00 AM UTC/).length).toBeGreaterThan(0);
  });

  it("uses sparse CLOB quote outcome indexes before Gamma outcome prices", async () => {
    window.localStorage.setItem("pmx.locale", "en");
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
        outcomePrices: ["0.01", "0.99"],
        volume: "746",
        liquidity: "16729",
        syncedAt: "2026-06-24T00:00:00.000Z",
        quotes: [
          {
            outcome: "DR Congo",
            outcomeIndex: 1,
            tokenId: "token_no",
            bestBid: null,
            bestAsk: null,
            midpoint: "0.74",
            spread: null,
            minOrderSize: "5",
            tickSize: "0.01",
            syncedAt: "2026-06-24T00:00:02.000Z"
          }
        ]
      }
    ]);

    renderHome();

    expect(await screen.findByRole("link", { name: "DR Congo 74c" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "DR Congo 99c" })).not.toBeInTheDocument();
  });

  it("switches the trading workspace to English", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByRole("heading", { name: "Market groups" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top markets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trade readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Order preview" })).toBeInTheDocument();
    expect(screen.getByText("Wallet not connected")).toBeInTheDocument();
    expect(screen.getByText("Deposit Wallet not created")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(window.localStorage.getItem("pmx.locale")).toBe("en");
  });
});

function renderHome() {
  render(
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );
}
