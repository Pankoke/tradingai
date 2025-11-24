"use client";

import React, { useState } from "react";
import type { JSX } from "react";

type Language = "de" | "en";

export function LanguageToggle(): JSX.Element {
  const [language, setLanguage] = useState<Language>("de");

  const handleChange = (value: Language): void => {
    setLanguage(value);
    // TODO: Später mit echter i18n-/Routing-Lösung verbinden (z. B. next-intl)
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] p-1 text-xs">
      <button
        type="button"
        onClick={() => handleChange("de")}
        className={`rounded-full px-2 py-0.5 ${language === "de" ? "bg-[var(--accent-soft)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => handleChange("en")}
        className={`rounded-full px-2 py-0.5 ${language === "en" ? "bg-[var(--accent-soft)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
      >
        EN
      </button>
    </div>
  );
}
