"use client";

import { useLanguage } from "./language-provider";
import type { Locale } from "./messages";

export function LanguageSwitcher() {
  const { locale, messages, setLocale } = useLanguage();

  const options: Array<{ label: string; value: Locale }> = [
    { label: messages.common.chinese, value: "zh-CN" },
    { label: messages.common.english, value: "en" }
  ];

  return (
    <div className="language-switcher" role="group" aria-label={messages.common.languageLabel}>
      {options.map((option) => (
        <button
          aria-pressed={locale === option.value}
          className={locale === option.value ? "active" : ""}
          key={option.value}
          onClick={() => setLocale(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
