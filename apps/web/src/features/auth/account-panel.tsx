"use client";

import { useEffect, useState } from "react";
import { clearAccessToken, getCurrentUser, readAccessToken, type AuthUser } from "./auth-client";

type AccountState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "error" };

export function AccountPanel() {
  const [state, setState] = useState<AccountState>({ status: "loading" });

  useEffect(() => {
    if (!readAccessToken()) {
      setState({ status: "anonymous" });
      return;
    }

    getCurrentUser()
      .then((user) => setState({ status: "authenticated", user }))
      .catch(() => setState({ status: "error" }));
  }, []);

  if (state.status === "loading") {
    return <p>加载账户信息</p>;
  }

  if (state.status === "anonymous") {
    return <p>请先登录</p>;
  }

  if (state.status === "error") {
    return <p>账户信息读取失败，请重新登录</p>;
  }

  return (
    <section className="panel account-panel">
      <h2>账户</h2>
      <p>{state.user.email}</p>
      <button
        type="button"
        onClick={() => {
          clearAccessToken();
          setState({ status: "anonymous" });
        }}
      >
        退出登录
      </button>
    </section>
  );
}
