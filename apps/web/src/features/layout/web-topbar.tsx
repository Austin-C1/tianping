"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearAccessToken,
  getCurrentUser,
  readAccessToken,
  type AuthUser
} from "../auth/auth-client";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { useLanguage } from "../i18n/language-provider";

type SessionState =
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser };

export function WebTopbar() {
  const { messages } = useLanguage();
  const [session, setSession] = useState<SessionState>({ status: "anonymous" });

  useEffect(() => {
    if (!readAccessToken()) {
      setSession({ status: "anonymous" });
      return;
    }

    getCurrentUser()
      .then((user) => setSession({ status: "authenticated", user }))
      .catch(() => setSession({ status: "anonymous" }));
  }, []);

  return (
    <header className="product-topbar">
      <div className="topbar-left">
        <Link className="brand" href="/">
          {messages.common.brand}
        </Link>
        <nav aria-label={messages.common.marketNav} className="market-nav">
          <Link href="/">{messages.common.markets}</Link>
          <Link href="/portfolio">{messages.common.portfolio}</Link>
          <Link href="/activity">{messages.common.activity}</Link>
        </nav>
      </div>
      <label className="topbar-search">
        <span>{messages.home.searchLabel}</span>
        <input placeholder={messages.home.searchPlaceholder} />
      </label>
      <div className="topbar-actions">
        {session.status === "authenticated" ? (
          <div className="session-pill">
            <Link href="/account">{session.user.email}</Link>
            <button
              type="button"
              onClick={() => {
                clearAccessToken();
                setSession({ status: "anonymous" });
              }}
            >
              {messages.auth.signOut}
            </button>
          </div>
        ) : (
          <nav aria-label={messages.common.accountNav}>
            <Link href="/register">{messages.common.register}</Link>
            <Link href="/login">{messages.common.login}</Link>
            <Link href="/account">{messages.common.account}</Link>
          </nav>
        )}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
