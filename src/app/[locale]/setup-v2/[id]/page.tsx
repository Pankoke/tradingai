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
  severity: "low" | "moderate" | "high";
};

type RiskProfile = "conservative" | "balanced" | "aggressive";

function clampScore(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeText(value: string | null | undefined, fallback: string): string {
  if (!value || value.trim().length === 0) return fallback;
  return value;
}

function parseNumbers(text: string | null | undefined): number[] {
  if (!text) return [];
  const matches = text.match(/-?\d+(\.\d+)?/g) ?? [];
  return matches.map((item) => Number.parseFloat(item)).filter((item) => Number.isFinite(item));
}

function deriveZoneValue(text: string | null | undefined): number | null {
  const values = parseNumbers(text);
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  const first = values[0] as number;
  const last = values[values.length - 1] as number;
  return (first + last) / 2;
}

function deriveDistanceRatio(setup: Setup): number | null {
  const interaction = deriveZoneValue(setup.entryZone);
  const invalidation = deriveZoneValue(setup.stopLoss);
  const objective = deriveZoneValue(setup.takeProfit);
  if (interaction === null || invalidation === null || objective === null) return null;
  const downside = Math.abs(interaction - invalidation);
  const upside = Math.abs(objective - interaction);
  if (downside <= 0) return null;
  return upside / downside;
}

function formatRatio(value: number | null, fallback: string): string {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return `${value.toFixed(1)}:1`;
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
  const dispersion = values.reduce((sum, value) => sum + Math.abs(value - mean), 0) / values.length;
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
      severity: Math.abs(orderflow - trend) >= 30 ? "high" : "moderate",
    });
  }
  if (Math.abs(bias - sentiment) >= 20) {
    conflicts.push({
      key: "biasSentiment",
      severity: Math.abs(bias - sentiment) >= 32 ? "high" : "moderate",
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
    conflicts.push({ key: "fallbackQuality", severity: "moderate" });
  }
  return conflicts;
}

function deriveConflictLevel(conflicts: ConflictSignal[]): "low" | "moderate" | "high" {
  if (conflicts.some((conflict) => conflict.severity === "high")) return "high";
  if (conflicts.length >= 2 || conflicts.some((conflict) => conflict.severity === "moderate")) return "moderate";
  return "low";
}

function deriveRiskProfile(setup: Setup): RiskProfile {
  const risk = setup.riskReward?.riskPercent;
  if (typeof risk === "number") {
    if (risk <= 1) return "conservative";
    if (risk <= 2.2) return "balanced";
    return "aggressive";
  }
  const label = setup.riskReward?.volatilityLabel;
  if (label === "low") return "conservative";
  if (label === "high") return "aggressive";
  return "balanced";
}

function formatAsOf(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return `${parsed.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function mapModelState(setup: Setup, locale: Locale): string {
  const copy = getSetupV2Copy(locale);
  const decision = (setup.decision ?? "").toUpperCase();
  if (decision === "WATCH_PLUS") return copy.details.modelStates.monitoringPlus;
  if (decision === "WATCH") return copy.details.modelStates.monitoring;
  if (decision === "BLOCKED" || decision === "NO_TRADE") return copy.details.modelStates.restricted;
  if (decision === "TRADE") return copy.details.modelStates.active;
  return copy.details.modelStates.neutral;
}

function getConflictTone(level: "low" | "moderate" | "high"): string {
  if (level === "high") return "border-rose-500/50 bg-rose-500/10 text-rose-100";
  if (level === "moderate") return "border-amber-500/50 bg-amber-500/10 text-amber-100";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
}

function getConflictChipTone(level: "low" | "moderate" | "high"): string {
  if (level === "high") return "border-rose-400/50 bg-rose-500/15 text-rose-100";
  if (level === "moderate") return "border-amber-400/50 bg-amber-500/15 text-amber-100";
  return "border-emerald-400/50 bg-emerald-500/15 text-emerald-100";
}

function deriveDriverIntensity(value: number): "soft" | "moderate" | "strong" {
  if (value >= 67) return "strong";
  if (value >= 45) return "moderate";
  return "soft";
}

function buildDriverRows(setup: Setup, copy: ReturnType<typeof getSetupV2Copy>) {
  const rows = [
    { key: "trend", label: copy.drivers.trend, value: clampScore(setup.rings?.trendScore), icon: <Layers className="h-4 w-4" /> },
    { key: "bias", label: copy.drivers.bias, value: clampScore(setup.biasScore), icon: <ShieldAlert className="h-4 w-4" /> },
    { key: "sentiment", label: copy.drivers.sentiment, value: clampScore(setup.sentimentScore), icon: <Waves className="h-4 w-4" /> },
    { key: "orderflow", label: copy.drivers.orderflow, value: clampScore(setup.rings?.orderflowScore), icon: <ActivityIcon /> },
    { key: "event", label: copy.drivers.event, value: clampScore(setup.eventScore), icon: <EventIcon /> },
    { key: "confidence", label: copy.drivers.confidence, value: clampScore(setup.confidence), icon: <ConfidenceIcon /> },
  ];
  return rows.sort((a, b) => b.value - a.value).map((row, index) => ({
    ...row,
    dominant: index < 2,
    intensity: deriveDriverIntensity(row.value),
  }));
}

function computeZonePositions(setup: Setup): { interaction: number; invalidation: number; objective: number } | null {
  const interactionRaw = deriveZoneValue(setup.entryZone);
  const invalidationRaw = deriveZoneValue(setup.stopLoss);
  const objectiveRaw = deriveZoneValue(setup.takeProfit);
  if (interactionRaw === null || invalidationRaw === null || objectiveRaw === null) return null;
  const values = [interactionRaw, invalidationRaw, objectiveRaw];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span <= 0) return { interaction: 50, invalidation: 50, objective: 50 };
  const normalize = (value: number) => ((value - min) / span) * 100;
  return {
    interaction: normalize(interactionRaw),
    invalidation: normalize(invalidationRaw),
    objective: normalize(objectiveRaw),
  };
}

function buildStructuralSummary(
  copy: ReturnType<typeof getSetupV2Copy>,
  params: {
    contextLabel: string;
    alignmentIndex: number;
    conflictLabel: string;
    riskProfileLabel: string;
    topDriverLabel: string;
  },
): string {
  return `${copy.hero.summaryLead} ${params.contextLabel} with alignment ${params.alignmentIndex}/100, ${params.conflictLabel.toLowerCase()} conflict load, and a ${params.riskProfileLabel.toLowerCase()} risk profile. ${params.topDriverLabel} is currently the most pronounced influence factor.`;
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
  const riskProfile = deriveRiskProfile(setup);
  const modelState = mapModelState(setup, locale);
  const distanceRatio = deriveDistanceRatio(setup);

  const interactionZone = safeText(setup.entryZone, copy.zones.unavailable);
  const invalidationZone = safeText(setup.stopLoss, copy.zones.unavailable);
  const objectiveZone = safeText(setup.takeProfit, copy.zones.unavailable);
  const asOfValue = formatAsOf(setup.snapshotCreatedAt ?? snapshot.snapshot.snapshotTime.toISOString(), copy.common.na);
  const driverRows = buildDriverRows(setup, copy);
  const zonePositions = computeZonePositions(setup);

  const contextLabel =
    contextDirection === "long" ? copy.context.long : contextDirection === "short" ? copy.context.short : copy.context.neutral;
  const conflictLabel =
    conflictLevel === "high" ? copy.conflict.high : conflictLevel === "moderate" ? copy.conflict.moderate : copy.conflict.low;
  const riskProfileLabel =
    riskProfile === "conservative"
      ? copy.hero.riskProfiles.conservative
      : riskProfile === "aggressive"
        ? copy.hero.riskProfiles.aggressive
        : copy.hero.riskProfiles.balanced;
  const topDriver = driverRows[0]?.label ?? copy.common.unknown;
  const structuralSummary = buildStructuralSummary(copy, {
    contextLabel,
    alignmentIndex,
    conflictLabel,
    riskProfileLabel,
    topDriverLabel: topDriver,
  });

  return (
    <main className="min-h-screen bg-[var(--bg-main)] px-4 py-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_50%),_radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.1),_transparent_45%),_rgba(3,7,18,0.95)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{copy.pageTitle}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
            {setup.symbol} · {setup.timeframe}
          </h1>
          <p className="mt-1 text-lg text-slate-200">{contextLabel}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <InlineMeta label={copy.hero.alignmentIndex} value={`${alignmentIndex}/100`} />
            <InlineMeta label={copy.hero.conflictLevel} value={conflictLabel} tone={getConflictTone(conflictLevel)} />
            <InlineMeta label={copy.hero.riskProfile} value={riskProfileLabel} />
            <InlineMeta label={copy.hero.asOf} value={asOfValue} />
            <InlineMeta label={copy.details.metrics.modelState} value={modelState} />
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200">{structuralSummary}</p>
          <p className="mt-2 text-xs text-slate-400">{copy.hero.summaryStability}</p>
          <p className="mt-3 text-xs text-slate-400">{copy.statusHint}</p>
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
          <p className="mt-3 text-sm opacity-90">{copy.conflict.stabilityNote}</p>
        </section>

        <section className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5">
          <h2 className="text-lg font-semibold text-white">{copy.zones.title}</h2>
          <p className="mt-1 text-sm text-slate-300">{copy.zones.subtitle}</p>

          {zonePositions ? (
            <div className="mt-4 rounded-xl border border-slate-700/70 bg-black/20 p-4">
              <div className="relative h-14">
                <div className="absolute top-6 h-1 w-full rounded-full bg-slate-800" />
                <ZoneMarker label={copy.zones.invalidation} position={zonePositions.invalidation} colorClass="bg-rose-400" />
                <ZoneMarker label={copy.zones.interaction} position={zonePositions.interaction} colorClass="bg-sky-400" />
                <ZoneMarker label={copy.zones.objective} position={zonePositions.objective} colorClass="bg-emerald-400" />
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ZoneCard label={copy.zones.interaction} value={interactionZone} tone="sky" />
            <ZoneCard label={copy.zones.invalidation} value={invalidationZone} tone="rose" />
            <ZoneCard label={copy.zones.objective} value={objectiveZone} tone="emerald" />
          </div>

          <div className="mt-3 rounded-xl border border-slate-700/70 bg-black/20 px-4 py-3 text-sm text-slate-200">
            <span className="mr-2 text-slate-400">{copy.zones.distanceRatio}:</span>
            <span className="font-semibold">{formatRatio(distanceRatio, copy.zones.unavailable)}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5">
          <h2 className="text-lg font-semibold text-white">{copy.drivers.title}</h2>
          <div className="mt-4 space-y-3">
            {driverRows.map((row) => (
              <DriverBar
                key={row.key}
                icon={row.icon}
                label={row.label}
                value={row.value}
                dominant={row.dominant}
                intensityLabel={copy.drivers.intensity[row.intensity]}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <details className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-white">{copy.details.titleMetrics}</summary>
            <dl className="mt-3 space-y-2 text-sm text-slate-300">
              <DetailRow label={copy.details.metrics.setupGrade} value={setup.setupGrade ?? copy.common.na} />
              <DetailRow label={copy.details.metrics.modelState} value={modelState} />
              <DetailRow label={copy.details.metrics.eventModifier} value={setup.eventModifier?.classification ?? copy.common.none} />
              <DetailRow label={copy.details.metrics.distanceRatio} value={formatRatio(distanceRatio, copy.common.na)} />
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
        </section>
      </div>
    </main>
  );
}

function InlineMeta({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}): JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-black/25 px-3 py-1.5 text-slate-200 ${tone ?? ""}`}>
      <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

function ZoneCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </article>
  );
}

function ZoneMarker({
  label,
  position,
  colorClass,
}: {
  label: string;
  position: number;
  colorClass: string;
}): JSX.Element {
  return (
    <div className="absolute top-0 -translate-x-1/2" style={{ left: `${position}%` }}>
      <div className={`h-3 w-3 rounded-full ${colorClass}`} />
      <p className="mt-2 whitespace-nowrap text-[11px] text-slate-300">{label}</p>
    </div>
  );
}

function DriverBar({
  icon,
  label,
  value,
  dominant,
  intensityLabel,
}: {
  icon: JSX.Element;
  label: string;
  value: number;
  dominant: boolean;
  intensityLabel: string;
}): JSX.Element {
  return (
    <div className={`space-y-1 rounded-lg px-2 py-1 ${dominant ? "bg-white/5" : ""}`}>
      <div className="flex items-center justify-between text-sm text-slate-200">
        <div className="flex items-center gap-2">
          <span className={`${dominant ? "text-white" : "text-slate-300"}`}>{icon}</span>
          <span className={dominant ? "font-semibold text-white" : ""}>{label}</span>
        </div>
        <span className={`${dominant ? "font-semibold text-white" : "text-slate-300"} text-xs uppercase tracking-[0.14em]`}>
          {intensityLabel}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${dominant ? "bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300" : "bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-500"}`}
          style={{ width: `${value}%` }}
        />
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
