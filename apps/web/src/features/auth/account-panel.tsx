"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/language-provider";
import { clearAccessToken, getCurrentUser, readAccessToken, type AuthUser } from "./auth-client";

type AccountState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "error" };

export function AccountPanel() {
  const { messages } = useLanguage();
  const copy = messages.auth;
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
    return <p>{copy.loadingAccount}</p>;
  }

  if (state.status === "anonymous") {
    return <p>{copy.signInFirst}</p>;
  }

  if (state.status === "error") {
    return <p>{copy.readAccountFailed}</p>;
  }

  return (
    <section className="panel account-panel">
      <h2>{copy.accountPanelTitle}</h2>
      <p>{state.user.email}</p>
      <button
        type="button"
        onClick={() => {
          clearAccessToken();
          setState({ status: "anonymous" });
        }}
      >
        {copy.signOut}
      </button>
    </section>
  );
}
