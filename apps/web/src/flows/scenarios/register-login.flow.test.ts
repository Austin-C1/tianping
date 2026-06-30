import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runRegisterLoginScenario } from "./register-login.flow";

describe("register-login flow scenario", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("registers, logs in, stores the login token, and loads the current user", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "registered-token",
          user: { email: "person@example.com", id: "user_123" }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "login-token",
          user: { email: "person@example.com", id: "user_123" }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: "person@example.com",
          id: "user_123",
          role: "USER"
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runRegisterLoginScenario({
        email: "person@example.com",
        password: "long-enough-password"
      })
    ).resolves.toEqual({
      currentUser: {
        email: "person@example.com",
        id: "user_123",
        role: "USER"
      },
      login: {
        accessToken: "login-token",
        user: {
          email: "person@example.com",
          id: "user_123"
        }
      },
      register: {
        accessToken: "registered-token",
        user: {
          email: "person@example.com",
          id: "user_123"
        }
      }
    });

    expect(window.localStorage.getItem("pmx.accessToken")).toBe("login-token");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://api.test/auth/register", {
      body: JSON.stringify({
        email: "person@example.com",
        password: "long-enough-password"
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://api.test/auth/login", {
      body: JSON.stringify({
        email: "person@example.com",
        password: "long-enough-password"
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "http://api.test/auth/me", {
      headers: { Authorization: "Bearer login-token" }
    });
  });
});
