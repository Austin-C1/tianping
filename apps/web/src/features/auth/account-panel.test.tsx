import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/language-provider";
import { AccountPanel } from "./account-panel";
import * as authClient from "./auth-client";

describe("AccountPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("shows a login prompt when no token is stored", async () => {
    vi.spyOn(authClient, "readAccessToken").mockReturnValue(null);

    renderAccountPanel();

    await waitFor(() => {
      expect(screen.getByText("请先登录")).toBeInTheDocument();
    });
  });

  it("loads and displays the current user", async () => {
    vi.spyOn(authClient, "readAccessToken").mockReturnValue("token");
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
  });

  it("shows account, wallet, deposit wallet, balance, and risk sections", async () => {
    vi.spyOn(authClient, "readAccessToken").mockReturnValue("token");
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "钱包状态" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deposit Wallet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "资金与授权" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "风控状态" })).toBeInTheDocument();
  });


  it("uses persisted English account copy", async () => {
    window.localStorage.setItem("pmx.locale", "en");
    vi.spyOn(authClient, "readAccessToken").mockReturnValue(null);

    renderAccountPanel();

    await waitFor(() => {
      expect(screen.getByText("Please sign in first")).toBeInTheDocument();
    });
  });
});

function renderAccountPanel() {
  render(
    <LanguageProvider>
      <AccountPanel />
    </LanguageProvider>
  );
}
