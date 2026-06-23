"use client";

import { AuthForm } from "../../features/auth/auth-form";
import { useLanguage } from "../../features/i18n/language-provider";
import { WebTopbar } from "../../features/layout/web-topbar";

export default function RegisterPage() {
  const { messages } = useLanguage();
  const copy = messages.auth;

  return (
    <main>
      <WebTopbar />
      <div className="shell narrow">
        <div className="eyebrow">{copy.stageEyebrow}</div>
        <h1>{copy.createAccount}</h1>
        <p>{copy.registerIntro}</p>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
