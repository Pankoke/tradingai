"use client";

import { useMemo, useState, type JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { SetupCardHeaderBlock } from "@/src/components/perception/setupViewModel/SetupCardHeaderBlock";
import { SetupCardRingsBlock } from "@/src/components/perception/setupViewModel/SetupCardRingsBlock";
import { SetupCardEventContextBlock } from "@/src/components/perception/setupViewModel/SetupCardEventContextBlock";
import { SetupCardExecutionBlock } from "@/src/components/perception/setupViewModel/SetupCardExecutionBlock";
import { SetupActionCards } from "@/src/components/perception/setupViewModel/SetupActionCards";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { BigGauge, getConfidenceGaugePalette, getSignalQualityGaugePalette } from "@/src/components/perception/RingGauges";
import { RiskRewardBlock } from "@/src/components/perception/RiskRewardBlock";
import { RingInsightTabs } from "@/src/components/perception/RingInsightTabs";
import {
  analyzeEventContext,
  pickPrimaryEventCandidate,
  type EventContextInsights,
  type PrimaryEventCandidate,
} from "@/src/components/perception/eventContextInsights";
import { deriveEventTimingHint } from "@/src/components/perception/eventExecutionHelpers";
import type { Setup } from "@/src/lib/engine/types";

type Props = {
  vm: SetupViewModel;
  mode: "sotd" | "list";
  defaultExpanded?: boolean;
  setupOriginal?: Setup;
};

export function SetupUnifiedCard({ vm, mode, defaultExpanded = false, setupOriginal }: Props): JSX.Element {
  const t = useT();
  const [activeRing, setActiveRing] = useState<"trend" | "event" | "bias" | "sentiment" | "orderflow">("trend");
  const [expanded, setExpanded] = useState(mode === "sotd" ? true : defaultExpanded);

  const signalQuality = vm.signalQuality ?? null;
  const confidenceScore = vm.rings.confidenceScore ?? 0;
  const confidencePalette = getConfidenceGaugePalette(confidenceScore ?? 0);
  const signalPalette = getSignalQualityGaugePalette(signalQuality?.score ?? 0);

  const eventContext = vm.eventContext ?? null;
  const compactMetrics = !expanded && mode === "list";
  const eventInsights = useMemo(() => analyzeEventContext(eventContext), [eventContext]);
  const primaryEventCandidate = useMemo(() => pickPrimaryEventCandidate(eventContext), [eventContext]);
  const executionContent = useMemo(() => buildExecutionContent(vm, t), [vm, t]);
  const collapsedBullets = useMemo(() => {
    const primary = pickCollapsedExecutionPrimaryBullet(vm, t);
    const invalidation = buildInvalidationBullet(vm, t);
    return [primary, invalidation].filter((line): line is string => Boolean(line));
  }, [t, vm]);
  const bulletsToRender = expanded ? executionContent.bullets : collapsedBullets;
  const actionCardsVariant = expanded ? "full" : "mini";

  const generatedAtText = vm.meta.generatedAt ?? vm.meta.snapshotCreatedAt ?? vm.meta.snapshotTime ?? null;
  const insightSetup = setupOriginal ?? (vm as unknown as Setup);
  const showInsightPanel = mode === "sotd" || expanded;
  const numberFormatter = useMemo(() => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: 2 }), []);

  const formatZone = (value: number | null, fallback?: string | null): string => {
    if (value === null || Number.isNaN(value)) return fallback ?? "n/a";
    const delta = Math.abs(value) * 0.0015;
    const low = value - delta;
    const high = value + delta;
    return `${numberFormatter.format(low)} - ${numberFormatter.format(high)}`;
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
      <SetupCardHeaderBlock
        setup={vm}
        generatedAtText={generatedAtText}
        timeframe={vm.timeframe}
        showEyebrow={mode === "sotd"}
        variant={mode === "list" && !expanded ? "compact" : "full"}
      />

      {expanded ? (
        <div className="grid gap-3 md:grid-cols-2">
          <SignalQualityCard signalQuality={signalQuality} palette={signalPalette} />
          <ConfidenceCard confidenceScore={confidenceScore} palette={confidencePalette} rings={vm.rings} />
        </div>
      ) : compactMetrics ? (
        <div className="grid gap-3 md:grid-cols-2">
          <CompactMetricCard title={t("perception.signalQuality.label")} value={signalQuality?.score ?? 0} palette={signalPalette} />
          <CompactMetricCard title={t("perception.today.confidenceLabel")} value={confidenceScore ?? 0} palette={confidencePalette} />
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.45)]">
          <SetupCardRingsBlock setup={vm} activeRing={activeRing} onActiveRingChange={setActiveRing} />
          {showInsightPanel ? (
            <div className="space-y-3 border-t border-slate-800 pt-4">
              {renderInsightContent()}
            </div>
          ) : null}
        </div>
      ) : null}

      {expanded ? (
        eventContext ? (
          <SetupCardEventContextBlock setup={vm} />
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
            {t("perception.eventContext.none")}
          </div>
        )
      ) : null}

      <SetupCardExecutionBlock title={executionContent.title} bullets={bulletsToRender} />

      <SetupActionCards
        entry={{
          display:
            vm.entry.display ??
            (vm.entry.from !== null && vm.entry.to !== null
              ? `${numberFormatter.format(vm.entry.from)} - ${numberFormatter.format(vm.entry.to)}`
              : "n/a"),
          noteKey: "setups.entry.note.default",
          copyValue: vm.entry.display ?? (vm.entry.from !== null ? String(vm.entry.from) : null),
        }}
        stop={{
          display: formatZone(vm.stop.value, vm.stop.display ?? null),
          noteKey: "setups.stop.note.default",
          copyValue: vm.stop.display ?? (vm.stop.value !== null ? String(vm.stop.value) : null),
        }}
        takeProfit={{
          display: formatZone(vm.takeProfit.value, vm.takeProfit.display ?? null),
          noteKey: "setups.takeProfit.note.primary",
          copyValue: vm.takeProfit.display ?? (vm.takeProfit.value !== null ? String(vm.takeProfit.value) : null),
        }}
        copyLabels={{
          copy: t("setups.action.copy"),
          copied: t("setups.action.copied"),
        }}
        variant={actionCardsVariant}
        allowCopy={false}
        forceRangeFromPoint
      />

      {expanded && vm.riskReward ? <RiskRewardBlock riskReward={vm.riskReward} /> : null}

      {mode === "list" ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-slate-100 transition hover:border-slate-500"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? t("perception.setup.details.showLess") : t("perception.setup.details.showMore")}
          </button>
        </div>
      ) : null}
    </div>
  );

  function renderInsightContent(): JSX.Element {
    const insight = (
      <RingInsightTabs
        setup={insightSetup}
        activeRing={activeRing}
        onActiveRingChange={setActiveRing}
        variant="full"
        showTabButtons={false}
        showSignalQualityInline={false}
        frameClassName={null}
      />
    );
    return insight ?? (
      <p className="text-sm text-slate-300">{t("perception.rings.insights.empty")}</p>
    );
  }
}

function SignalQualityCard({
  signalQuality,
  palette,
}: {
  signalQuality: SetupViewModel["signalQuality"];
  palette: ReturnType<typeof getSignalQualityGaugePalette>;
}): JSX.Element {
  const t = useT();
  const reasons = signalQuality?.reasons ?? [];
  const score = signalQuality?.score ?? 0;
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-100">
          {t("perception.signalQuality.label")}
        </p>
        <p className="text-xs text-slate-400">{t("perception.signalQuality.definition")}</p>
        <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-300">
          {t("perception.signalQuality.bulletsTitle")}
        </p>
        <ul className="space-y-1 text-sm text-slate-100">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>
                {(() => {
                  const translation = t(reason);
                  return translation === reason ? t("perception.signalQuality.reason.default") : translation;
                })()}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="ml-auto flex items-center justify-center">
        <BigGauge value={score} label={t("perception.signalQuality.label")} palette={palette} />
      </div>
    </div>
  );
}

function ConfidenceCard({
  confidenceScore,
  palette,
  rings,
}: {
  confidenceScore: number;
  palette: ReturnType<typeof getConfidenceGaugePalette>;
  rings: SetupViewModel["rings"];
}): JSX.Element {
  const t = useT();
  const consistencyLevel = confidenceScore >= 60 ? "high" : confidenceScore >= 45 ? "medium" : "low";
  const eventLevel = (rings.eventScore ?? 0) >= 70 ? "high" : (rings.eventScore ?? 0) >= 40 ? "medium" : "low";
  const bullets = [
    t(`perception.confidence.bullets.consistency.${consistencyLevel}`),
    t(`perception.confidence.bullets.eventRisk.${eventLevel}`),
  ];

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-100">
          {t("perception.today.confidenceLabel")}
        </p>
        <p className="text-xs text-slate-400">{t("perception.confidence.definition")}</p>
        <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-300">
          {t("perception.confidence.bulletsTitle")}
        </p>
        <ul className="space-y-1 text-sm text-slate-100">
          {bullets.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="ml-auto flex items-center justify-center">
        <BigGauge value={confidenceScore} label={t("perception.today.confidenceLabel")} palette={palette} />
      </div>
    </div>
  );
}

function CompactMetricCard({
  title,
  value,
  palette,
}: {
  title: string;
  value: number;
  palette: ReturnType<typeof getSignalQualityGaugePalette> | ReturnType<typeof getConfidenceGaugePalette>;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-200">{title}</p>
        <p className="text-xs text-slate-400">{value.toFixed(0)}%</p>
      </div>
      <div className="scale-75">
        <BigGauge value={value} label="" palette={palette} />
      </div>
    </div>
  );
}

const ORDERFLOW_HIGH_THRESHOLD = 75;
const ORDERFLOW_LOW_THRESHOLD = 35;
const TREND_BIAS_DIVERGENCE_THRESHOLD = 25;
const CONFIDENCE_STRONG_THRESHOLD = 70;
const SIGNAL_QUALITY_STRONG_THRESHOLD = 65;
const SIGNAL_QUALITY_STANDARD_THRESHOLD = 50;

function buildExecutionContent(vm: SetupViewModel, t: ReturnType<typeof useT>): { title: string; bullets: string[] } {
  const rings = vm.rings;
  const eventScore = rings.eventScore ?? 0;
  const eventLevel = eventScore >= 70 ? "highSoon" : eventScore >= 45 ? "elevated" : "calm";
  const signalQuality = vm.signalQuality?.score ?? 0;
  const confidence = vm.rings.confidenceScore ?? 0;
  const mergedEventInsights = analyzeEventContext(vm.eventContext ?? null) as EventContextInsights | null;
  const mergedPrimaryEvent = pickPrimaryEventCandidate(vm.eventContext ?? null) as PrimaryEventCandidate | null;
  const eventTimingHint = mergedEventInsights ? deriveEventTimingHint(mergedEventInsights, mergedPrimaryEvent, t) : null;

  // Title selection: event-driven overrides, then strong alignment, then balanced/cautious.
  const title =
    eventLevel === "highSoon" || eventLevel === "elevated"
      ? t("perception.execution.title.eventDriven")
      : confidence >= 70 && signalQuality >= 65
        ? t("perception.execution.title.highConviction")
        : signalQuality >= 50
          ? t("perception.execution.title.balanced")
          : t("perception.execution.title.cautious");

  // Bullets A/B chosen from templates, C always invalidation.
  const bullets: string[] = [];
  if (eventLevel === "highSoon" || eventLevel === "elevated") {
    bullets.push(t("perception.execution.bulletA.eventDriven"));
    bullets.push(eventTimingHint ?? t("perception.execution.bulletB.eventDriven"));
  } else if (confidence >= 70 && signalQuality >= 65) {
    bullets.push(t("perception.execution.bulletA.highConviction"));
    bullets.push(t("perception.execution.bulletB.highConviction"));
  } else if (signalQuality >= 50) {
    bullets.push(t("perception.execution.bulletA.balanced"));
    bullets.push(t("perception.execution.bulletB.balanced"));
  } else {
    bullets.push(t("perception.execution.bulletA.cautious"));
    bullets.push(t("perception.execution.bulletB.cautious"));
  }

  const invalidation = buildInvalidationBullet(vm, t);
  if (invalidation) bullets.push(invalidation);

  return { title, bullets };
}

export function pickCollapsedExecutionPrimaryBullet(vm: SetupViewModel, t: ReturnType<typeof useT>): string {
  const eventLevelFromMeta = vm.meta.eventLevel;
  const eventScore = vm.rings.eventScore ?? 0;
  const normalizedEventLevel =
    eventLevelFromMeta === "high"
      ? "highSoon"
      : eventLevelFromMeta === "medium"
        ? "elevated"
        : eventLevelFromMeta === "low"
          ? "calm"
          : eventScore >= 70
            ? "highSoon"
            : eventScore >= 45
              ? "elevated"
              : "calm";

  if (normalizedEventLevel === "highSoon" || normalizedEventLevel === "elevated") {
    const topEvent = vm.eventContext?.topEvents?.[0];
    if (topEvent?.title || topEvent?.name) {
      const name = (topEvent.title || topEvent.name || "").trim();
      return t("perception.execution.collapsed.eventNamed", { event: name });
    }
    return t("perception.execution.collapsed.eventGeneric");
  }

  const orderflowScore = vm.rings.orderflowScore ?? 0;
  if (orderflowScore >= ORDERFLOW_HIGH_THRESHOLD) {
    return t("perception.execution.collapsed.primary.orderflowHigh");
  }
  if (orderflowScore <= ORDERFLOW_LOW_THRESHOLD) {
    return t("perception.execution.collapsed.primary.orderflowLow");
  }

  const trendScore = vm.rings.trendScore ?? 0;
  const biasScore = vm.rings.biasScore ?? 0;
  if (Math.abs(trendScore - biasScore) >= TREND_BIAS_DIVERGENCE_THRESHOLD) {
    return t("perception.execution.collapsed.primary.confirmation");
  }

  const signalQualityScore = vm.signalQuality?.score ?? SIGNAL_QUALITY_STANDARD_THRESHOLD;
  const confidenceScore = vm.rings.confidenceScore ?? 0;
  if (confidenceScore >= CONFIDENCE_STRONG_THRESHOLD && signalQualityScore >= SIGNAL_QUALITY_STRONG_THRESHOLD) {
    return t("perception.execution.collapsed.primary.sizeNormalPlus");
  }
  if (signalQualityScore >= SIGNAL_QUALITY_STANDARD_THRESHOLD) {
    return t("perception.execution.collapsed.primary.sizeStandard");
  }
  return t("perception.execution.collapsed.primary.sizeReduced");
}

function buildInvalidationBullet(vm: SetupViewModel, t: ReturnType<typeof useT>): string | null {
  const dir = vm.direction;
  const stop = vm.stop.value;
  const hasEntryRange = vm.entry.from !== null || vm.entry.to !== null;

  if (stop != null && dir) {
    if (dir === "Long") return t("perception.execution.invalidation.stop.long");
    if (dir === "Short") return t("perception.execution.invalidation.stop.short");
  }

  if (hasEntryRange) {
    return t("perception.execution.invalidation.entryFallback");
  }

  return t("perception.execution.invalidation.ringsFallback");
}
