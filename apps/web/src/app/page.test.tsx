import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../features/i18n/language-provider";
import Home from "./page";

describe("Home", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the product trading workspace", () => {
    renderHome();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "PMX Trading"
    );
    expect(screen.getByRole("heading", { name: "市场筛选" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "市场浏览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "市场详情" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "交易准备" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "订单预览" })).toBeInTheDocument();
    expect(screen.getByText("钱包未连接")).toBeInTheDocument();
    expect(screen.getByText("Deposit Wallet 未创建")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "人工确认 Gate" })).toBeDisabled();
  });

  it("switches the trading workspace to English", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByRole("heading", { name: "Market filters" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Market overview" })).toBeInTheDocument();
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
