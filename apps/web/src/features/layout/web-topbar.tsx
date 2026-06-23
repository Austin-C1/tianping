"use client";

import Link from "next/link";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { useLanguage } from "../i18n/language-provider";

export function WebTopbar() {
  const { messages } = useLanguage();

  return (
    <header className="product-topbar">
      <Link className="brand" href="/">
        {messages.common.brand}
      </Link>
      <div className="topbar-actions">
        <nav aria-label={messages.common.accountNav}>
          <Link href="/register">{messages.common.register}</Link>
          <Link href="/login">{messages.common.login}</Link>
          <Link href="/account">{messages.common.account}</Link>
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
