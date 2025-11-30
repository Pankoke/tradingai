import type { JSX } from "react";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import { EngineMetaPanel } from "@/src/components/perception/EngineMetaPanel";
import { FiveRingsExplainer } from "@/src/components/perception/FiveRingsExplainer";
import { PerceptionRingsExplainer } from "@/src/components/perception/PerceptionRingsExplainer";

type PageProps = {
  params: Promise<{ locale?: string }>;
};

function getMessages(locale: string): Record<string, string> {
  if (locale === "de") return deMessages as Record<string, string>;
  return enMessages as Record<string, string>;
}

export default async function PremiumPerceptionPage({ params }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const localeParam = resolvedParams?.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  const t = (key: string): string => getMessages(locale)[key] ?? key;

  const snapshot = await buildPerceptionSnapshot();
  return (
    <main className="min-h-screen bg-[var(--bg-main)] px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-4 text-[var(--text-primary)]">
        <h1 className="text-2xl font-semibold">Premium Perception</h1>
        <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
            {t("perception.engineMeta.title")}
          </p>
          <EngineMetaPanel generatedAt={snapshot.generatedAt} version={snapshot.version} />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("perception.rings.explainerIntro")}
        </p>
        <div className="mt-6">
          <FiveRingsExplainer t={t} />
        </div>
        <div className="mt-8">
          <PerceptionRingsExplainer />
        </div>
      </div>
    </main>
  );
}
