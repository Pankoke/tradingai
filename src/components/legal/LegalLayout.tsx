"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useT } from "../../lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "../../lib/i18n/config";

type LegalTab = "imprint" | "privacy" | "terms";

interface LegalLayoutProps {
  children: ReactNode;
  activeTab: LegalTab;
}

function localePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];

  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }

  return `/${i18nConfig.defaultLocale}`;
}

export function LegalLayout({ children, activeTab }: LegalLayoutProps) {
  const t = useT();
  const pathname = usePathname() || "/";
  const prefix = localePrefix(pathname);

  const basePath = `${prefix}/legal`;

  const tabs: { id: LegalTab; href: string; label: string }[] = [
    {
      id: "imprint",
      href: `${basePath}/imprint`,
      label: t("legal.imprint.title"),
    },
    {
      id: "privacy",
      href: `${basePath}/privacy`,
      label: t("legal.privacy.title"),
    },
    {
      id: "terms",
      href: `${basePath}/terms`,
      label: t("legal.terms.title"),
    },
  ];

  const activeLabel =
    tabs.find((tab) => tab.id === activeTab)?.label ?? "Legal";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{activeLabel}</h1>
        <p className="text-sm text-muted-foreground">{t("footer.risk")}</p>
      </header>

      {/* Tabs / Navigation */}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <a
              key={tab.id}
              href={tab.href}
              className={[
                "rounded-full border px-3 py-1 text-sm transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              {tab.label}
            </a>
          );
        })}
      </nav>

      {/* Content */}
      <div className="rounded-xl border border-border/80 bg-background/60 p-6 shadow-sm">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {children}
        </div>
      </div>
    </div>
  );
}
