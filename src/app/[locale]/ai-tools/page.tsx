"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../../lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "../../../lib/i18n/config";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";
import { AppShell } from "@/src/components/layout/AppShell";

type ToolCard = {
  key: string;
  href: string;
  badge?: string;
};

function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return maybeLocale as Locale;
  }
  return i18nConfig.defaultLocale;
}

export default function AiToolsHubPage({ params }: { params: { locale: string } }): JSX.Element {
  const t = useT();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname || `/${params.locale ?? i18nConfig.defaultLocale}`);
  const localePrefix = `/${locale}`;
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const tools: ToolCard[] = [
    { key: "setupGenerator", href: `${localePrefix}/ai-tools/setup-generator` },
    { key: "marketSummary", href: `${localePrefix}/ai-tools/market-summary` },
    { key: "eventInterpreter", href: `${localePrefix}/ai-tools/event-interpreter` },
    { key: "riskManager", href: `${localePrefix}/ai-tools/risk-manager` },
    {
      key: "screenshotAnalysis",
      href: `${localePrefix}/ai-tools/screenshot-analysis`,
      badge: t("aiToolsHub.tools.screenshotAnalysis.badge"),
    },
  ];

  return (
    <AppShell section="aiTools">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("aiToolsHub.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("aiToolsHub.intro")}</p>
        </header>

        <ProNotice context="aiTools" />

        {!isPro ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 text-sm text-[var(--text-secondary)] shadow-md">
            {t("proNotice.text.aiTools")}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {tools.map((tool) => (
              <article
                key={tool.key}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      {t(`aiToolsHub.tools.${tool.key}.title`)}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t(`aiToolsHub.tools.${tool.key}.description`)}
                    </p>
                  </div>
                  {tool.badge ? (
                    <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2 py-1 text-[0.65rem] uppercase tracking-wide text-[var(--text-secondary)]">
                      {tool.badge}
                    </span>
                  ) : null}
                </div>
                <div>
                  <Link
                    href={tool.href}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-black hover:opacity-90"
                  >
                    {t("aiToolsHub.openTool")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
