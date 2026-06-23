import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountPanel } from "./account-panel";
import * as authClient from "./auth-client";

describe("AccountPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a login prompt when no token is stored", async () => {
    vi.spyOn(authClient, "readAccessToken").mockReturnValue(null);

    render(<AccountPanel />);

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

    render(<AccountPanel />);

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
  });
});
