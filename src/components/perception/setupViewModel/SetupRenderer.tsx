"use client";

import { useMemo, useState, type JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { SetupViewModel } from "./types";
import { SetupCardHeaderBlock } from "./SetupCardHeaderBlock";
import { SetupCardRingsBlock } from "./SetupCardRingsBlock";
import { SetupCardEventContextBlock } from "./SetupCardEventContextBlock";
import { SetupCardExecutionBlock } from "./SetupCardExecutionBlock";
import { classifyTradeSignal } from "@/src/components/perception/PrimaryTradeSignal";
import {
  analyzeEventContext,
  pickPrimaryEventCandidate,
  type EventContextInsights,
  type PrimaryEventCandidate,
} from "@/src/components/perception/eventContextInsights";
import { deriveEventTimingHint } from "@/src/components/perception/eventExecutionHelpers";

type Props = {
  vm: SetupViewModel;
  variant: "full" | "compact";
  hideEventContext?: boolean;
  hideExecution?: boolean;
  headerTypeLabel?: string | null;
};

export function SetupRenderer({
  vm,
  variant,
  hideEventContext,
  hideExecution,
  headerTypeLabel,
}: Props): JSX.Element {
  const t = useT();
  const [activeRing, setActiveRing] = useState<"trend" | "event" | "bias" | "sentiment" | "orderflow">("trend");

  const executionChips = useMemo(() => buildExecutionChips(vm, t), [vm, t]);
  const executionBullets = useMemo(() => buildExecutionBullets(vm, t), [vm, t]);
  const signal = useMemo(() => classifyTradeSignal(vm as unknown as Parameters<typeof classifyTradeSignal>[0]), [vm]);

  const generatedAtText = vm.meta.generatedAt ?? vm.meta.snapshotCreatedAt ?? null;

  const showEventContext = !hideEventContext && Boolean(vm.eventContext);
  const showExecution = !hideExecution;

  const bulletsForVariant =
    variant === "compact" && executionBullets.length > 0 ? executionBullets.slice(0, 2) : executionBullets;

  return (
    <div className="flex flex-col gap-6">
      <SetupCardHeaderBlock
        setup={vm}
        generatedAtText={generatedAtText}
        timeframe={vm.timeframe}
        typeLabel={headerTypeLabel ?? null}
        variant={variant}
      />
      <SetupCardRingsBlock setup={vm} activeRing={activeRing} onActiveRingChange={setActiveRing} />
      {showEventContext ? <SetupCardEventContextBlock setup={vm} /> : null}
      {showExecution ? (
        <SetupCardExecutionBlock setup={vm} chips={executionChips} bullets={bulletsForVariant} signal={signal} />
      ) : null}
    </div>
  );
}

function buildExecutionChips(setup: SetupViewModel, t: ReturnType<typeof useT>): string[] {
  const confidenceScore = setup.rings.confidenceScore ?? 0;
  const eventScore = setup.rings.eventScore ?? 0;
  const eventLevel = eventScore >= 75 ? "high" : eventScore >= 40 ? "medium" : "low";
  const sizingKey = mapSignalToSizing(classifyTradeSignal(setup as unknown as Parameters<typeof classifyTradeSignal>[0]));
  return [
    t("perception.execution.chip.confidence").replace("{value}", String(Math.round(confidenceScore))),
    t(`perception.execution.chip.event.${eventLevel}`),
    t(`perception.execution.chip.sizing.${sizingKey}`),
  ];
}

function buildExecutionBullets(setup: SetupViewModel, t: ReturnType<typeof useT>): string[] {
  const rings = setup.rings;
  const eventScore = rings.eventScore ?? 0;
  const eventLevel = eventScore >= 75 ? "high" : eventScore >= 40 ? "medium" : "low";
  const signal = classifyTradeSignal(setup as unknown as Parameters<typeof classifyTradeSignal>[0]);
  const sizingKey = mapSignalToSizing(signal);
  const mergedEventInsights = analyzeEventContext(setup.eventContext ?? null) as EventContextInsights | null;
  const mergedPrimaryEvent = pickPrimaryEventCandidate(setup.eventContext ?? null) as PrimaryEventCandidate | null;
  const eventTimingHint = deriveEventTimingHint(mergedEventInsights, mergedPrimaryEvent, t);

  return [
    t(`perception.execution.bullets.sizing.${sizingKey}`),
    eventTimingHint ?? t(`perception.execution.bullets.event.${eventLevel}`),
    t(`perception.execution.bullets.focus.${deriveFocusKey(rings)}`),
  ];
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
