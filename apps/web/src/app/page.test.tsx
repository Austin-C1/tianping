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
    fetchMarketsMock.mockResolvedValue([]);
  });

  it("shows the product trading workspace", () => {
    renderHome();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "市场"
    );
    expect(screen.getByRole("heading", { name: "精选市场" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "热门市场" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "交易准备" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "订单票据" })).toBeInTheDocument();
    expect(screen.getByText("钱包未连接")).toBeInTheDocument();
    expect(screen.getByText("Deposit Wallet 未创建")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "人工确认 Gate" })).toBeDisabled();
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
    expect(screen.getByRole("button", { name: "是 0c" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "否 100c" })).toBeInTheDocument();
  });

  it("switches the trading workspace to English", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByRole("heading", { name: "Featured markets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top markets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trade readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Order ticket" })).toBeInTheDocument();
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
