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
import { isEventModifierEnabledClient } from "@/src/lib/config/eventModifier";

type Props = {
  vm: SetupViewModel;
  mode: "sotd" | "list";
  defaultExpanded?: boolean;
  setupOriginal?: Setup;
};

export function SetupUnifiedCard({ vm, mode, defaultExpanded = false, setupOriginal }: Props): JSX.Element {
  const t = useT();
  const modifierEnabled = isEventModifierEnabledClient();
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
  const executionContent = useMemo(() => buildExecutionContent(vm, t, modifierEnabled), [vm, t, modifierEnabled]);
  const primaryCollapsed = useMemo(
    () => pickCollapsedExecutionPrimaryBullet(vm, t, modifierEnabled),
    [vm, t, modifierEnabled],
  );
  const collapsedBullets = useMemo(() => {
    const invalidation = buildInvalidationBullet(vm, t);
    return [primaryCollapsed.text, invalidation].filter((line): line is string => Boolean(line));
  }, [primaryCollapsed.text, t, vm]);
  const bulletsToRender = expanded ? executionContent.bullets : collapsedBullets;
  const execDebugEnabled = process.env.NEXT_PUBLIC_EXEC_DEBUG === "1";
  const executionDebugLine =
    execDebugEnabled && !expanded
      ? [
          `debug: branch=${primaryCollapsed.debug.branch}${
            primaryCollapsed.debug.eventLevel ? ` execLevel=${primaryCollapsed.debug.eventLevel}` : ""
          }${
            primaryCollapsed.debug.metaEventLevel ? ` metaLevel=${primaryCollapsed.debug.metaEventLevel}` : ""
          }${primaryCollapsed.debug.eventScore !== undefined ? ` eventScore=${primaryCollapsed.debug.eventScore}` : ""}${
            primaryCollapsed.debug.branchReason ? ` reason=${primaryCollapsed.debug.branchReason}` : ""
          }`,
          primaryCollapsed.debug.topEventsCount !== undefined
            ? `debug: eventCtx present=${primaryCollapsed.debug.eventContextPresent} count=${primaryCollapsed.debug.topEventsCount} raw="${primaryCollapsed.debug.topEventTitleRaw ?? ""}" sanitized="${primaryCollapsed.debug.topEventTitleSanitized ?? ""}"`
            : null,
          primaryCollapsed.debug.topEventTitleRawLen !== undefined
            ? `debug: title lens raw=${primaryCollapsed.debug.topEventTitleRawLen} sanitized=${primaryCollapsed.debug.topEventTitleSanitizedLen} truncated=${primaryCollapsed.debug.topEventTitleTruncated} empty=${primaryCollapsed.debug.topEventTitleEmptyAfterSanitize} fallback=${primaryCollapsed.debug.topEventTitleUsedFallback} source=${primaryCollapsed.debug.topEventTitleSource ?? "n/a"}`
            : null,
          `debug: rings t=${primaryCollapsed.debug.rings.trendScore ?? "n/a"} b=${primaryCollapsed.debug.rings.biasScore ?? "n/a"} s=${primaryCollapsed.debug.rings.sentimentScore ?? "n/a"} of=${primaryCollapsed.debug.rings.orderflowScore ?? "n/a"} e=${primaryCollapsed.debug.rings.eventScore ?? "n/a"} c=${primaryCollapsed.debug.rings.confidenceScore ?? "n/a"} sq=${primaryCollapsed.debug.signalQualityScore ?? "n/a"} conf=${primaryCollapsed.debug.confidenceScore ?? "n/a"} deltaTB=${primaryCollapsed.debug.trendBiasDelta ?? "n/a"}`,
          `debug: thresholds ofHi=${primaryCollapsed.debug.thresholds.orderflowHigh} ofLo=${primaryCollapsed.debug.thresholds.orderflowLow} dTB=${primaryCollapsed.debug.thresholds.trendBiasDelta} confHi=${primaryCollapsed.debug.thresholds.confidenceHigh} sqHi=${primaryCollapsed.debug.thresholds.signalQualityHigh} sqMed=${primaryCollapsed.debug.thresholds.signalQualityStandard}`,
        ].filter((line): line is string => Boolean(line))
      : null;
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
          <ConfidenceCard
            confidenceScore={confidenceScore}
            palette={confidencePalette}
            rings={vm.rings}
            modifierEnabled={modifierEnabled}
          />
        </div>
      ) : compactMetrics ? (
        <div className="grid gap-3 md:grid-cols-2">
          <CompactMetricCard title={t("perception.signalQuality.label")} value={signalQuality?.score ?? 0} palette={signalPalette} />
          <CompactMetricCard title={t("perception.today.confidenceLabel")} value={confidenceScore ?? 0} palette={confidencePalette} />
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.45)]">
          <SetupCardRingsBlock
            setup={vm}
            activeRing={activeRing}
            onActiveRingChange={setActiveRing}
            hideEventRing={modifierEnabled}
          />
          {showInsightPanel ? (
            <div className="space-y-3 border-t border-slate-800 pt-4">
              {renderInsightContent()}
            </div>
          ) : null}
        </div>
      ) : null}

      {expanded && !modifierEnabled
        ? eventContext
          ? <SetupCardEventContextBlock setup={vm} />
          : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
              {t("perception.eventContext.none")}
            </div>
          )
        : null}

      <SetupCardExecutionBlock
        title={executionContent.title}
        bullets={bulletsToRender}
        debugLines={executionDebugLine}
        eventModifier={vm.eventModifier ?? null}
      />

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
        hideEventTab={modifierEnabled}
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
  modifierEnabled,
}: {
  confidenceScore: number;
  palette: ReturnType<typeof getConfidenceGaugePalette>;
  rings: SetupViewModel["rings"];
  modifierEnabled: boolean;
}): JSX.Element {
  const t = useT();
  const consistencyLevel = confidenceScore >= 60 ? "high" : confidenceScore >= 45 ? "medium" : "low";
  const eventLevel = modifierEnabled ? "low" : (rings.eventScore ?? 0) >= 70 ? "high" : (rings.eventScore ?? 0) >= 40 ? "medium" : "low";
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

function buildExecutionContent(vm: SetupViewModel, t: ReturnType<typeof useT>, modifierEnabled: boolean): { title: string; bullets: string[] } {
  const rings = vm.rings;
  const eventScore = modifierEnabled ? 0 : rings.eventScore ?? 0;
  const eventLevel = modifierEnabled ? "calm" : eventScore >= 70 ? "highSoon" : eventScore >= 45 ? "elevated" : "calm";
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

type ExecutionPrimaryResult = {
  text: string;
  debug: {
    branch:
      | "eventNamed"
      | "eventGeneric"
      | "orderflowHigh"
      | "orderflowLow"
      | "confirmation"
      | "sizeNormalPlus"
      | "sizeStandard"
      | "sizeReduced";
    branchReason?: string;
    eventLevel?: string;
    execEventLevel?: string;
    eventLevelRaw?: string | null;
    metaEventLevel?: string | null;
    eventScore?: number | null;
    eventContextPresent?: boolean;
    topEventsCount?: number;
    topEventTitleRaw?: string | null;
    topEventTitleSanitized?: string | null;
    topEventTitleRawLen?: number | null;
    topEventTitleSanitizedLen?: number | null;
    topEventTitleTruncated?: boolean | null;
    topEventTitleEmptyAfterSanitize?: boolean | null;
    topEventTitleUsedFallback?: boolean | null;
    topEventTitleSource?: string | null;
    topEventImpactRaw?: number | null;
    topEventWhenRaw?: string | null;
    eventSource?: string | null;
    orderflowScore?: number;
    trendBiasDelta?: number;
    sizingKey?: string;
    signalQualityScore?: number | null;
    signalQualityGrade?: string | null;
    confidenceScore?: number | null;
    rings: {
      trendScore?: number | null;
      biasScore?: number | null;
      sentimentScore?: number | null;
      orderflowScore?: number | null;
      eventScore?: number | null;
      confidenceScore?: number | null;
    };
    thresholds: {
      orderflowHigh: number;
      orderflowLow: number;
      trendBiasDelta: number;
      confidenceHigh: number;
      signalQualityHigh: number;
      signalQualityStandard: number;
    };
  };
};

const EVENT_TITLE_MAX_LENGTH = 60;

function sanitizeEventTitle(
  rawInput: string | null | undefined,
): {
  raw: string;
  sanitized: string;
  truncated: boolean;
  emptyAfterSanitize: boolean;
  usedFallback: boolean;
  rawLen: number;
  sanitizedLen: number;
} {
  const raw = (rawInput ?? "").trim();
  const withoutControls = raw.replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]+/g, "");
  const collapsed = withoutControls.replace(/\s+/g, " ").trim();
  const base = collapsed.length > 0 ? collapsed : raw;
  const emptyAfterSanitize = collapsed.length === 0;
  let sanitized = base;
  let truncated = false;
  if (sanitized.length > EVENT_TITLE_MAX_LENGTH) {
    sanitized = `${sanitized.slice(0, EVENT_TITLE_MAX_LENGTH - 1)}…`;
    truncated = true;
  }
  return {
    raw,
    sanitized,
    truncated,
    emptyAfterSanitize,
    usedFallback: emptyAfterSanitize && raw.length > 0,
    rawLen: raw.length,
    sanitizedLen: sanitized.length,
  };
}


export function pickCollapsedExecutionPrimaryBullet(
  vm: SetupViewModel,
  t: ReturnType<typeof useT>,
  modifierEnabled: boolean,
): ExecutionPrimaryResult {
  const eventLevelFromMeta = vm.meta.eventLevel;
  const eventScore = modifierEnabled ? 0 : vm.rings.eventScore ?? 0;
  const execEventLevel = modifierEnabled ? "calm" : eventScore >= 70 ? "highSoon" : eventScore >= 45 ? "elevated" : "calm";
  const normalizedMetaEventLevel =
    modifierEnabled
      ? null
      : eventLevelFromMeta === "high"
        ? "highSoon"
        : eventLevelFromMeta === "medium"
          ? "elevated"
          : eventLevelFromMeta === "low"
            ? "calm"
            : null;

  const topEvent = vm.eventContext?.topEvents?.[0];
  const titleSource = topEvent
    ? "displayTitle" in topEvent && typeof (topEvent as { displayTitle?: string | null }).displayTitle === "string"
      ? "displayTitle"
      : "title"
    : null;
  const sanitized = sanitizeEventTitle(
    titleSource === "displayTitle"
      ? (topEvent as { displayTitle?: string | null }).displayTitle
      : topEvent?.title ?? null,
  );
  const baseDebug: ExecutionPrimaryResult["debug"] = {
    branch: "sizeStandard",
    eventLevel: execEventLevel,
    execEventLevel,
    metaEventLevel: normalizedMetaEventLevel,
    eventScore: eventScore ?? null,
    eventLevelRaw: eventLevelFromMeta ?? null,
    eventContextPresent: Boolean(vm.eventContext),
    topEventsCount: vm.eventContext?.topEvents?.length ?? 0,
    topEventTitleRaw: sanitized.raw ?? null,
    topEventTitleSanitized: sanitized.sanitized ?? null,
    topEventTitleRawLen: sanitized.rawLen,
    topEventTitleSanitizedLen: sanitized.sanitizedLen,
    topEventTitleTruncated: sanitized.truncated,
    topEventTitleEmptyAfterSanitize: sanitized.emptyAfterSanitize,
    topEventTitleUsedFallback: sanitized.usedFallback,
    topEventTitleSource: titleSource,
    topEventImpactRaw: (topEvent as { impact?: number | null })?.impact ?? null,
    topEventWhenRaw: (topEvent as { scheduledAt?: string | null })?.scheduledAt ?? null,
    eventSource: (topEvent as { source?: string | null })?.source ?? null,
    orderflowScore: vm.rings.orderflowScore ?? null,
    trendBiasDelta: Math.abs((vm.rings.trendScore ?? 0) - (vm.rings.biasScore ?? 0)),
    sizingKey: undefined,
    signalQualityScore: vm.signalQuality?.score ?? null,
    signalQualityGrade: (vm.signalQuality as { grade?: string })?.grade ?? null,
    confidenceScore: vm.rings.confidenceScore ?? null,
    rings: {
      trendScore: vm.rings.trendScore ?? null,
      biasScore: vm.rings.biasScore ?? null,
      sentimentScore: vm.rings.sentimentScore ?? null,
      orderflowScore: vm.rings.orderflowScore ?? null,
      eventScore: vm.rings.eventScore ?? null,
      confidenceScore: vm.rings.confidenceScore ?? null,
    },
    thresholds: {
      orderflowHigh: ORDERFLOW_HIGH_THRESHOLD,
      orderflowLow: ORDERFLOW_LOW_THRESHOLD,
      trendBiasDelta: TREND_BIAS_DIVERGENCE_THRESHOLD,
      confidenceHigh: CONFIDENCE_STRONG_THRESHOLD,
      signalQualityHigh: SIGNAL_QUALITY_STRONG_THRESHOLD,
      signalQualityStandard: SIGNAL_QUALITY_STANDARD_THRESHOLD,
    },
  };

  if (execEventLevel === "highSoon" || execEventLevel === "elevated") {
    if (sanitized.sanitized) {
      const template = t("perception.execution.collapsed.eventNamed");
      const resolved = template.includes("{event}") ? template.replace("{event}", sanitized.sanitized) : `${template} ${sanitized.sanitized}`;
      return {
        text: resolved,
        debug: {
          ...baseDebug,
          branch: "eventNamed",
          branchReason: "eventLevel(exec)=high/elevated && topEvent=present",
        },
      };
    }
    return {
      text: t("perception.execution.collapsed.eventGeneric"),
      debug: {
        ...baseDebug,
        branch: "eventGeneric",
        branchReason: "eventLevel(exec)=high/elevated but no usable title",
      },
    };
  }
  baseDebug.branchReason = "event gate: execEventLevel is calm";

  const orderflowScore = vm.rings.orderflowScore ?? 0;
  if (orderflowScore >= ORDERFLOW_HIGH_THRESHOLD) {
    return {
      text: t("perception.execution.collapsed.primary.orderflowHigh"),
      debug: { ...baseDebug, branch: "orderflowHigh", branchReason: "orderflow>=high", orderflowScore },
    };
  }
  if (orderflowScore <= ORDERFLOW_LOW_THRESHOLD) {
    return {
      text: t("perception.execution.collapsed.primary.orderflowLow"),
      debug: { ...baseDebug, branch: "orderflowLow", branchReason: "orderflow<=low", orderflowScore },
    };
  }

  const trendScore = vm.rings.trendScore ?? 0;
  const biasScore = vm.rings.biasScore ?? 0;
  if (Math.abs(trendScore - biasScore) >= TREND_BIAS_DIVERGENCE_THRESHOLD) {
    const delta = Math.abs(trendScore - biasScore);
    return {
      text: t("perception.execution.collapsed.primary.confirmation"),
      debug: { ...baseDebug, branch: "confirmation", branchReason: "trend/bias delta >= threshold", trendBiasDelta: delta },
    };
  }

  const signalQualityScore = vm.signalQuality?.score ?? SIGNAL_QUALITY_STANDARD_THRESHOLD;
  const confidenceScore = vm.rings.confidenceScore ?? 0;
  if (confidenceScore >= CONFIDENCE_STRONG_THRESHOLD && signalQualityScore >= SIGNAL_QUALITY_STRONG_THRESHOLD) {
    const key = "perception.execution.collapsed.primary.sizeNormalPlus";
    return { text: t(key), debug: { ...baseDebug, branch: "sizeNormalPlus", branchReason: "conf>=70 && sq>=65", sizingKey: key } };
  }
  if (signalQualityScore >= SIGNAL_QUALITY_STANDARD_THRESHOLD) {
    const key = "perception.execution.collapsed.primary.sizeStandard";
    return { text: t(key), debug: { ...baseDebug, branch: "sizeStandard", branchReason: "sq>=50", sizingKey: key } };
  }
  const key = "perception.execution.collapsed.primary.sizeReduced";
  return { text: t(key), debug: { ...baseDebug, branch: "sizeReduced", branchReason: "default fallback", sizingKey: key } };
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








