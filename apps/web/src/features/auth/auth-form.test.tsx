import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";
import * as authClient from "./auth-client";

describe("AuthForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registers and stores the returned access token", async () => {
    vi.spyOn(authClient, "register").mockResolvedValue({
      accessToken: "token",
      user: { id: "user_123", email: "person@example.com" }
    });
    const saveAccessToken = vi.spyOn(authClient, "saveAccessToken");

    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" }
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "long-enough-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => expect(saveAccessToken).toHaveBeenCalledWith("token"));
    expect(screen.getByText("已注册并登录：person@example.com")).toBeInTheDocument();
  });

  it("logs in and stores the returned access token", async () => {
    vi.spyOn(authClient, "login").mockResolvedValue({
      accessToken: "token",
      user: { id: "user_123", email: "person@example.com" }
    });
    const saveAccessToken = vi.spyOn(authClient, "saveAccessToken");

    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" }
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "long-enough-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => expect(saveAccessToken).toHaveBeenCalledWith("token"));
    expect(screen.getByText("已登录：person@example.com")).toBeInTheDocument();
  });
});
