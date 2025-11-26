"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";
import { AppShell } from "@/src/components/layout/AppShell";

type PageProps = {
  params: { locale: string };
};

export default function DocsExamplesPage({ params }: PageProps): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const tsSnippet = `const res = await fetch("https://api.tradingai.dev/v1/setups", {
  headers: { Authorization: "Bearer YOUR_API_KEY" },
});
const data = await res.json();
console.log(data);`;

  const pythonSnippet = `import requests

resp = requests.get(
    "https://api.tradingai.dev/v1/setups",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
)
print(resp.json())`;

  if (!isPro) {
    return (
      <AppShell section="docs">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <ProNotice context="docs" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell section="docs">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("docs.examples.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.examples.intro")}</p>
        </header>

        <section className="space-y-3 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.examples.example1.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.examples.example1.body")}</p>
          <pre className="overflow-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm">
            <code>{tsSnippet}</code>
          </pre>
        </section>

        <section className="space-y-3 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.examples.example2.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.examples.example2.body")}</p>
          <pre className="overflow-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm">
            <code>{pythonSnippet}</code>
          </pre>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.examples.notes.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.examples.notes.body")}</p>
        </section>
      </div>
    </AppShell>
  );
}
