"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useT } from "@/src/lib/i18n/ClientProvider";

const links = [
  { href: "/backtesting/event", key: "links.event" },
  { href: "/backtesting/history", key: "links.history" },
  { href: "/backtesting/replay", key: "links.replay" },
  { href: "/backtesting/ai", key: "links.ai" },
];

export default function BacktestingOverviewPage(): JSX.Element {
  const t = useT();

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("backtesting.overview.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("backtesting.overview.subtitle")}</p>
        </header>

        <ProNotice context="backtesting" />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("backtesting.overview.sections.title")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm transition hover:-translate-y-[1px]"
              >
                <div className="text-sm font-semibold text-[var(--text-primary)]">{t(`backtesting.overview.${link.key}`)}</div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{t(`backtesting.overview.${link.key}Desc`)}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
