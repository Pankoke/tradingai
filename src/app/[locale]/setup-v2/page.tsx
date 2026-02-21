import type { JSX } from "react";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";
import type { Setup } from "@/src/lib/engine/types";
import { getRadarCopy } from "@/src/app/[locale]/setup-v2/radar-copy";
import { RadarListClient, type RadarItem } from "@/src/app/[locale]/setup-v2/RadarListClient";

type PageProps = {
  params: Promise<{ locale?: string }>;
};

type ConflictLevel = "low" | "moderate" | "high";

function clampScore(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveContext(setup: Setup): "long" | "short" | "neutral" {
  const trend = clampScore(setup.rings?.trendScore);
  const bias = clampScore(setup.biasScore);
  const sentiment = clampScore(setup.sentimentScore);
  const orderflow = clampScore(setup.rings?.orderflowScore);
  const avg = (trend + bias + sentiment + orderflow) / 4;
  if (avg >= 55) return "long";
  if (avg <= 45) return "short";
  return "neutral";
}

function deriveAlignmentIndex(setup: Setup): number {
  const values = [
    clampScore(setup.rings?.trendScore),
    clampScore(setup.biasScore),
    clampScore(setup.sentimentScore),
    clampScore(setup.rings?.orderflowScore),
  ];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const dispersion = values.reduce((sum, value) => sum + Math.abs(value - mean), 0) / values.length;
  return Math.max(0, Math.min(100, Math.round(100 - dispersion * 1.7)));
}

function deriveConflictLevel(setup: Setup): ConflictLevel {
  const trend = clampScore(setup.rings?.trendScore);
  const bias = clampScore(setup.biasScore);
  const sentiment = clampScore(setup.sentimentScore);
  const orderflow = clampScore(setup.rings?.orderflowScore);
  const divergenceFlowTrend = Math.abs(orderflow - trend);
  const divergenceBiasSentiment = Math.abs(bias - sentiment);
  const eventCritical = setup.eventModifier?.classification === "execution_critical";
  const metaFallback =
    setup.rings?.meta != null &&
    Object.values(setup.rings.meta).some(
      (meta) => meta.quality === "fallback" || meta.quality === "stale" || meta.quality === "heuristic",
    );

  if (eventCritical || divergenceFlowTrend >= 30 || divergenceBiasSentiment >= 32) return "high";
  if (divergenceFlowTrend >= 18 || divergenceBiasSentiment >= 20 || metaFallback) return "moderate";
  return "low";
}

function computeFreshnessMinutes(asOf: Date | null): number | null {
  if (!asOf) return null;
  const diffMs = Date.now() - asOf.getTime();
  if (!Number.isFinite(diffMs)) return null;
  return Math.max(0, Math.round(diffMs / 60000));
}

function computeAttentionScore(params: {
  conflict: ConflictLevel;
  alignment: number;
  freshnessMinutes: number | null;
}): number {
  const conflictWeight = params.conflict === "high" ? 180 : params.conflict === "moderate" ? 120 : 70;
  const stalenessWeight =
    params.freshnessMinutes === null ? 30 : Math.min(params.freshnessMinutes, 12 * 60) / (12 * 60) * 30;
  return conflictWeight + params.alignment + stalenessWeight;
}

function formatAsOfLabel(asOf: Date | null, fallback: string): string {
  if (!asOf) return fallback;
  return `${asOf.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export default async function SetupV2RadarPage({ params }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const localeParam = resolvedParams.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;

  const copy = getRadarCopy(locale);
  const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
  const latest = await snapshotStore.loadLatestSnapshotFromStore();

  const items: RadarItem[] = (latest?.setups ?? [])
    .map((setup) => {
      const context = deriveContext(setup);
      const alignment = deriveAlignmentIndex(setup);
      const conflict = deriveConflictLevel(setup);
      const asOfIsoRaw = setup.snapshotCreatedAt ?? latest?.snapshot.snapshotTime?.toISOString() ?? null;
      const asOf = asOfIsoRaw ? new Date(asOfIsoRaw) : null;
      const asOfSafe = asOf && !Number.isNaN(asOf.getTime()) ? asOf : null;
      const freshnessMinutes = computeFreshnessMinutes(asOfSafe);
      const attention = computeAttentionScore({
        conflict,
        alignment,
        freshnessMinutes,
      });

      return {
        id: setup.id,
        symbol: setup.symbol ?? setup.assetId,
        assetLabel: setup.assetId ?? setup.symbol,
        timeframe: setup.timeframe ?? "n/a",
        context,
        contextLabel:
          context === "long" ? copy.context.long : context === "short" ? copy.context.short : copy.context.neutral,
        alignmentIndex: alignment,
        conflictLevel: conflict,
        conflictLabel:
          conflict === "high" ? copy.conflict.high : conflict === "moderate" ? copy.conflict.moderate : copy.conflict.low,
        asOfLabel: formatAsOfLabel(asOfSafe, "-"),
        freshnessMinutes,
        attentionScore: attention,
      } satisfies RadarItem;
    })
    .filter((item) => item.id && item.symbol);

  return (
    <main className="min-h-screen bg-[var(--bg-main)] px-4 py-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_52%),_rgba(3,7,18,0.92)] p-5">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-300">{copy.subtitle}</p>
          <p className="mt-3 text-xs text-slate-400">{copy.disclaimer}</p>
        </header>

        <RadarListClient locale={locale} copy={copy} items={items} />
      </div>
    </main>
  );
}
