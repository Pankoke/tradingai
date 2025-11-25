"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { useT } from "@/src/lib/i18n/ClientProvider";

type ProNoticeContext = "setupsPremium" | "aiTools" | "backtesting" | "docs" | "default";

type ProNoticeProps = {
  context?: ProNoticeContext;
};

export function ProNotice({ context = "default" }: ProNoticeProps): JSX.Element {
  const t = useT();
  const textKey = `proNotice.text.${context}`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm md:p-5">
      <div className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {t("proNotice.title")}
      </div>
      <p className="text-sm text-[var(--text-secondary)] md:text-base">{t(textKey)}</p>
      <div>
        <Link
          href="/pricing"
          className="inline-flex items-center text-sm font-semibold text-[var(--accent)] underline underline-offset-4 hover:opacity-90"
        >
          {t("proNotice.cta")}
        </Link>
      </div>
    </div>
  );
}
