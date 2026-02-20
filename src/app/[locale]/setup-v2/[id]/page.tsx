import type { JSX } from "react";
import { AlertTriangle, Layers, ShieldAlert, Waves } from "lucide-react";
import { notFound } from "next/navigation";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";
import type { Setup } from "@/src/lib/engine/types";
import { getSetupV2Copy } from "@/src/app/[locale]/setup-v2/copy";

type PageProps = {
  params: Promise<{ locale?: string; id?: string }>;
};

type ConflictSignal = {
  key: "flowTrend" | "biasSentiment" | "eventPressure" | "fallbackQuality";
  severity: "low" | "medium" | "high";
};

function parseEntryZone(value: string | null | undefined, fallback: string): string {
  if (!value || value.trim().length === 0) return fallback;
  return value;
}

function parseLevel(value: string | null | undefined, fallback: string): string {
  if (!value || value.trim().length === 0) return fallback;
  return value;
}

function clampScore(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveContextDirection(setup: Setup): "long" | "short" | "neutral" {
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
  const dispersion =
    values.reduce((sum, value) => sum + Math.abs(value - mean), 0) / values.length;
  return Math.max(0, Math.min(100, Math.round(100 - dispersion * 1.7)));
}

function deriveConflictSignals(setup: Setup): ConflictSignal[] {
  const trend = clampScore(setup.rings?.trendScore);
  const bias = clampScore(setup.biasScore);
  const sentiment = clampScore(setup.sentimentScore);
  const orderflow = clampScore(setup.rings?.orderflowScore);

  const conflicts: ConflictSignal[] = [];
  if (Math.abs(orderflow - trend) >= 18) {
    conflicts.push({
      key: "flowTrend",
      severity: Math.abs(orderflow - trend) >= 30 ? "high" : "medium",
    });
  }
  if (Math.abs(bias - sentiment) >= 20) {
    conflicts.push({
      key: "biasSentiment",
      severity: Math.abs(bias - sentiment) >= 32 ? "high" : "medium",
    });
  }

  if (setup.eventModifier?.classification === "execution_critical") {
    conflicts.push({ key: "eventPressure", severity: "high" });
  }

  const ringMeta = setup.rings?.meta;
  const hasFallbackQuality =
    ringMeta != null &&
    Object.values(ringMeta).some(
      (meta) => meta.quality === "fallback" || meta.quality === "stale" || meta.quality === "heuristic",
    );
  if (hasFallbackQuality) {
    conflicts.push({ key: "fallbackQuality", severity: "medium" });
  }

  return conflicts;
}

function deriveConflictLevel(conflicts: ConflictSignal[]): "low" | "medium" | "high" {
  if (conflicts.some((conflict) => conflict.severity === "high")) return "high";
  if (conflicts.length >= 2 || conflicts.some((conflict) => conflict.severity === "medium")) return "medium";
  return "low";
}

function deriveRiskProfile(setup: Setup, fallback: string): string {
  const label = setup.riskReward?.volatilityLabel;
  const risk = setup.riskReward?.riskPercent;
  const riskText = typeof risk === "number" ? `${risk.toFixed(2)}%` : fallback;
  if (!label) return `Undefined (${riskText})`;
  return `${label.toUpperCase()} (${riskText})`;
}

function formatAsOf(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return `${parsed.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function getConflictTone(level: "low" | "medium" | "high"): string {
  if (level === "high") return "border-rose-500/50 bg-rose-500/10 text-rose-100";
  if (level === "medium") return "border-amber-500/50 bg-amber-500/10 text-amber-100";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
}

function getConflictChipTone(level: "low" | "medium" | "high"): string {
  if (level === "high") return "border-rose-400/50 bg-rose-500/15 text-rose-100";
  if (level === "medium") return "border-amber-400/50 bg-amber-500/15 text-amber-100";
  return "border-emerald-400/50 bg-emerald-500/15 text-emerald-100";
}

export default async function SetupV2Page({ params }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const localeParam = resolvedParams.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  const setupId = resolvedParams.id;
  if (!setupId) notFound();

  const copy = getSetupV2Copy(locale);
  const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
  const snapshot = await snapshotStore.loadLatestSnapshotFromStore();
  if (!snapshot) notFound();

  const setup = snapshot.setups.find((item) => item.id === setupId);
  if (!setup) notFound();

  const contextDirection = deriveContextDirection(setup);
  const alignmentIndex = deriveAlignmentIndex(setup);
  const conflictSignals = deriveConflictSignals(setup);
  const conflictLevel = deriveConflictLevel(conflictSignals);
  const riskProfile = deriveRiskProfile(setup, copy.common.na);

  const interactionZone = parseEntryZone(setup.entryZone, copy.zones.unavailable);
  const invalidationZone = parseLevel(setup.stopLoss, copy.zones.unavailable);
  const objectiveZone = parseLevel(setup.takeProfit, copy.zones.unavailable);

  const contextLabel =
    contextDirection === "long"
      ? copy.context.long
      : contextDirection === "short"
        ? copy.context.short
        : copy.context.neutral;

  const conflictLabel =
    conflictLevel === "high"
      ? copy.conflict.high
      : conflictLevel === "medium"
        ? copy.conflict.medium
        : copy.conflict.low;

  const asOfValue = formatAsOf(setup.snapshotCreatedAt ?? snapshot.snapshot.snapshotTime.toISOString(), copy.common.na);

  return (
    <main className="min-h-screen bg-[var(--bg-main)] px-4 py-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_50%),_radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.1),_transparent_45%),_rgba(3,7,18,0.95)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{copy.pageTitle}</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                {setup.symbol} - {setup.timeframe}
              </h1>
              <p className="mt-2 text-sm text-slate-300">{copy.statusHint}</p>
            </div>
            <div className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${getConflictTone(conflictLevel)}`}>
              {copy.hero.conflictLevel}: {conflictLabel}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={copy.hero.contextDirection} value={contextLabel} />
            <MetricCard label={copy.hero.alignmentIndex} value={`${alignmentIndex}/100`} />
            <MetricCard label={copy.hero.riskProfile} value={riskProfile} />
            <MetricCard label={copy.hero.asOf} value={asOfValue} />
          </div>
        </section>

        <section className={`rounded-2xl border p-5 ${getConflictTone(conflictLevel)}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="text-lg font-semibold">{copy.conflict.title}</h2>
              <p className="mt-1 text-sm opacity-90">{copy.conflict.subtitle}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {conflictSignals.length === 0 ? (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-100">
                {copy.conflict.none}
              </span>
            ) : (
              conflictSignals.map((conflict) => (
                <span
                  key={`${conflict.key}-${conflict.severity}`}
                  className={`rounded-full border px-3 py-1 text-sm ${getConflictChipTone(conflict.severity)}`}
                >
                  {copy.conflict.items[conflict.key]}
                </span>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5">
          <h2 className="text-lg font-semibold text-white">{copy.zones.title}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ZoneCard label={copy.zones.interaction} value={interactionZone} fallback={copy.zones.unavailable} tone="sky" />
            <ZoneCard label={copy.zones.invalidation} value={invalidationZone} fallback={copy.zones.unavailable} tone="rose" />
            <ZoneCard label={copy.zones.objective} value={objectiveZone} fallback={copy.zones.unavailable} tone="emerald" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5">
            <h2 className="text-lg font-semibold text-white">{copy.drivers.title}</h2>
            <div className="mt-4 space-y-3">
              <DriverBar icon={<Layers className="h-4 w-4" />} label={copy.drivers.trend} value={clampScore(setup.rings?.trendScore)} />
              <DriverBar icon={<ShieldAlert className="h-4 w-4" />} label={copy.drivers.bias} value={clampScore(setup.biasScore)} />
              <DriverBar icon={<Waves className="h-4 w-4" />} label={copy.drivers.sentiment} value={clampScore(setup.sentimentScore)} />
              <DriverBar icon={<ActivityIcon />} label={copy.drivers.orderflow} value={clampScore(setup.rings?.orderflowScore)} />
              <DriverBar icon={<EventIcon />} label={copy.drivers.event} value={clampScore(setup.eventScore)} />
              <DriverBar icon={<ConfidenceIcon />} label={copy.drivers.confidence} value={clampScore(setup.confidence)} />
            </div>
          </div>

          <div className="space-y-3">
            <details className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-white">{copy.details.titleMetrics}</summary>
              <dl className="mt-3 space-y-2 text-sm text-slate-300">
                <DetailRow label={copy.details.metrics.setupGrade} value={setup.setupGrade ?? copy.common.na} />
                <DetailRow label={copy.details.metrics.decisionClass} value={setup.decision ?? copy.common.na} />
                <DetailRow label={copy.details.metrics.eventModifier} value={setup.eventModifier?.classification ?? copy.common.none} />
                <DetailRow label={copy.details.metrics.riskRewardRatio} value={setup.riskReward?.rrr?.toFixed(2) ?? copy.common.na} />
              </dl>
            </details>

            <details className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-white">{copy.details.titleDefinitions}</summary>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>{copy.details.definitions.alignment}</li>
                <li>{copy.details.definitions.conflict}</li>
                <li>{copy.details.definitions.zones}</li>
              </ul>
            </details>

            <details className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-white">{copy.details.titleMetadata}</summary>
              <dl className="mt-3 space-y-2 text-sm text-slate-300">
                <DetailRow label={copy.details.metadata.snapshotId} value={setup.snapshotId ?? snapshot.snapshot.id} />
                <DetailRow label={copy.details.metadata.snapshotLabel} value={snapshot.snapshot.label ?? copy.common.na} />
                <DetailRow label={copy.details.metadata.engineVersion} value={snapshot.snapshot.version ?? copy.common.unknown} />
                <DetailRow label={copy.details.metadata.generated} value={asOfValue} />
              </dl>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-black/25 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ZoneCard({
  label,
  value,
  fallback,
  tone,
}: {
  label: string;
  value: string;
  fallback: string;
  tone: "sky" | "rose" | "emerald";
}): JSX.Element {
  const toneClass =
    tone === "sky"
      ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
      : tone === "rose"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
  return (
    <article className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value || fallback}</p>
    </article>
  );
}

function DriverBar({ icon, label, value }: { icon: JSX.Element; label: string; value: number }): JSX.Element {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-slate-300">{icon}</span>
          <span>{label}</span>
        </div>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-100">{value}</dd>
    </div>
  );
}

function ActivityIcon(): JSX.Element {
  return <span className="inline-block h-2 w-2 rounded-full bg-cyan-300" />;
}

function EventIcon(): JSX.Element {
  return <span className="inline-block h-2 w-2 rounded-full bg-amber-300" />;
}

function ConfidenceIcon(): JSX.Element {
  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />;
}
