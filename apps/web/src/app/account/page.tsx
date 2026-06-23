"use client";

import { AccountPanel } from "../../features/auth/account-panel";
import { useLanguage } from "../../features/i18n/language-provider";
import { WebTopbar } from "../../features/layout/web-topbar";

export default function AccountPage() {
  const { messages } = useLanguage();
  const copy = messages.auth;

  return (
    <main>
      <WebTopbar />
      <div className="shell narrow">
        <div className="eyebrow">{copy.accountEyebrow}</div>
        <h1>{copy.accountTitle}</h1>
        <AccountPanel />
      </div>
    </main>
  );
}
