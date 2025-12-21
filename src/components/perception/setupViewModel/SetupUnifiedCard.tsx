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
import { classifyTradeSignal } from "@/src/components/perception/PrimaryTradeSignal";
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
  const eventInsights = useMemo(() => analyzeEventContext(eventContext), [eventContext]);
  const primaryEventCandidate = useMemo(() => pickPrimaryEventCandidate(eventContext), [eventContext]);
  const executionChips = useMemo(() => buildExecutionChips(vm, t), [vm, t]);
  const executionBullets = useMemo(() => buildExecutionBullets(vm, t), [vm, t]);
  const invalidation = useMemo(() => buildInvalidationBullet(vm, t), [vm, t]);
  const bulletsToRender = (expanded ? executionBullets : executionBullets.slice(0, 1)).concat(invalidation ? [invalidation] : []);
  const actionCardsVariant = expanded ? "full" : "mini";

  const generatedAtText = vm.meta.generatedAt ?? vm.meta.snapshotCreatedAt ?? vm.meta.snapshotTime ?? null;
  const insightSetup = setupOriginal ?? (vm as unknown as Setup);
  const showInsightPanel = mode === "sotd" || expanded;

  return (
    <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
      <SetupCardHeaderBlock setup={vm} generatedAtText={generatedAtText} timeframe={vm.timeframe} />

      {expanded ? (
        <div className="grid gap-3 md:grid-cols-2">
          <SignalQualityCard signalQuality={signalQuality} palette={signalPalette} />
          <ConfidenceCard confidenceScore={confidenceScore} palette={confidencePalette} rings={vm.rings} />
        </div>
      ) : null}

      <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_10px_40px_rgba(2,6,23,0.45)]">
        <SetupCardRingsBlock setup={vm} activeRing={activeRing} onActiveRingChange={setActiveRing} />
        {showInsightPanel ? (
          <div className="space-y-3 border-t border-slate-800 pt-4">
            {renderInsightContent()}
          </div>
        ) : null}
      </div>

      {expanded && eventContext ? <SetupCardEventContextBlock setup={vm} /> : null}

      <SetupCardExecutionBlock setup={vm} chips={executionChips} bullets={bulletsToRender} signal={classifyTradeSignal(vm as any)} />

      <SetupActionCards
        entry={{
          display: vm.entry.display ?? (vm.entry.from !== null && vm.entry.to !== null ? `${vm.entry.from} - ${vm.entry.to}` : "n/a"),
          noteKey: "setups.entry.note.default",
          copyValue: vm.entry.display ?? (vm.entry.from !== null ? String(vm.entry.from) : null),
        }}
        stop={{
          display: vm.stop.display ?? (vm.stop.value !== null ? String(vm.stop.value) : "n/a"),
          noteKey: "setups.stop.note.default",
          copyValue: vm.stop.display ?? (vm.stop.value !== null ? String(vm.stop.value) : null),
        }}
        takeProfit={{
          display: vm.takeProfit.display ?? (vm.takeProfit.value !== null ? String(vm.takeProfit.value) : "n/a"),
          noteKey: "setups.takeProfit.note.primary",
          copyValue: vm.takeProfit.display ?? (vm.takeProfit.value !== null ? String(vm.takeProfit.value) : null),
        }}
        copyLabels={{
          copy: t("setups.action.copy"),
          copied: t("setups.action.copied"),
        }}
        variant={actionCardsVariant}
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

function buildExecutionChips(vm: SetupViewModel, t: ReturnType<typeof useT>): string[] {
  const confidenceScore = vm.rings.confidenceScore ?? 0;
  const eventScore = vm.rings.eventScore ?? 0;
  const eventLevel = eventScore >= 75 ? "high" : eventScore >= 40 ? "medium" : "low";
  const sizingKey = mapSignalToSizing(classifyTradeSignal(vm as any));
  return [
    t("perception.execution.chip.confidence").replace("{value}", String(Math.round(confidenceScore))),
    t(`perception.execution.chip.event.${eventLevel}`),
    t(`perception.execution.chip.sizing.${sizingKey}`),
  ];
}

function buildExecutionBullets(vm: SetupViewModel, t: ReturnType<typeof useT>): string[] {
  const rings = vm.rings;
  const eventScore = rings.eventScore ?? 0;
  const eventLevel = eventScore >= 75 ? "high" : eventScore >= 40 ? "medium" : "low";
  const signal = classifyTradeSignal(vm as any);
  const sizingKey = mapSignalToSizing(signal);
  const mergedEventInsights = analyzeEventContext(vm.eventContext ?? null) as EventContextInsights | null;
  const mergedPrimaryEvent = pickPrimaryEventCandidate(vm.eventContext ?? null) as PrimaryEventCandidate | null;
  const eventTimingHint = mergedEventInsights ? deriveEventTimingHint(mergedEventInsights, mergedPrimaryEvent, t) : null;

  return [
    t(`perception.execution.bullets.sizing.${sizingKey}`),
    eventTimingHint ?? t(`perception.execution.bullets.event.${eventLevel}`),
    t(`perception.execution.bullets.focus.${deriveFocusKey(rings)}`),
  ];
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

type ExecutionSignal = ReturnType<typeof classifyTradeSignal>;

function deriveFocusKey(rings: SetupViewModel["rings"]): "trendBias" | "flow" | "sentiment" | "structure" {
  const trend = rings.trendScore ?? 0;
  const bias = rings.biasScore ?? 0;
  const flow = rings.orderflowScore ?? 0;
  const sentiment = rings.sentimentScore ?? 0;
  if (trend >= 65 && bias >= 65) return "trendBias";
  if (flow >= 65) return "flow";
  if (sentiment >= 65) return "sentiment";
  return "structure";
}

function mapSignalToSizing(signal: ExecutionSignal): "strong" | "core" | "cautious" | "noEdge" {
  if (signal === "strongLong" || signal === "strongShort") return "strong";
  if (signal === "coreLong" || signal === "coreShort") return "core";
  if (signal === "cautious") return "cautious";
  return "noEdge";
}

function buildRiskRewardContext(vm: SetupViewModel, t: ReturnType<typeof useT>): string[] {
  const lines: string[] = [];
  const eventLevel = vm.meta.eventLevel ?? null;
  if (eventLevel) {
    lines.push(t(`events.risk.badge.${eventLevel === "high" ? "highSoon" : eventLevel === "medium" ? "elevated" : "calm"}`));
  }
  if (vm.signalQuality) {
    lines.push(t("perception.signalQuality.gradeLabel").replace("{grade}", vm.signalQuality.grade ?? "N/A"));
  }
  const sizingKey = mapSignalToSizing(classifyTradeSignal(vm as any));
  lines.push(t(`perception.execution.chip.sizing.${sizingKey}`));
  return lines;
}
