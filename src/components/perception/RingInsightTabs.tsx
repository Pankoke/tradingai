"use client";

import type { JSX } from "react";
import { useMemo, useState, useEffect } from "react";
import clsx from "clsx";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";
import { SentimentInspector } from "@/src/components/perception/SentimentInspector";
import { OrderflowInspector } from "@/src/components/perception/OrderflowInspector";
import { TrendInspector } from "@/src/components/perception/TrendInspector";
import { BiasInspector } from "@/src/components/perception/BiasInspector";
import { EventInspector } from "@/src/components/perception/EventInspector";
import { SignalQualityBadge } from "@/src/components/perception/SignalQualityBadge";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";

export type RingTabId = "trend" | "event" | "bias" | "sentiment" | "orderflow";

type RingTabConfig = {
  id: RingTabId;
  labelKey: string;
  isVisible: (setup: Setup) => boolean;
  render: (params: { setup: Setup; variant: "full" | "compact" }) => JSX.Element | null;
};

type RingInsightTabsProps = {
  setup: Setup;
  variant?: "full" | "compact";
  showSignalQualityInline?: boolean;
  activeRing?: RingTabId | null;
  onActiveRingChange?: (id: RingTabId) => void;
  showTabButtons?: boolean;
  frameClassName?: string | null;
  hideEventTab?: boolean;
};

const hasOrderflowContent = (current: Setup): boolean => {
  const orderflow = current.orderflow;
  if (!orderflow) {
    return false;
  }
  const hasScore = typeof orderflow.score === "number";
  const reasonCount = orderflow.reasonDetails?.length ?? orderflow.reasons?.length ?? 0;
  const hasReasons = reasonCount > 0;
  const hasFlags = (orderflow.flags?.length ?? 0) > 0;
  return hasScore || hasReasons || hasFlags;
};

const ringTabs: RingTabConfig[] = [
  {
    id: "trend",
    labelKey: "perception.ringTabs.trend",
    isVisible: (setup) => typeof setup.rings?.trendScore === "number",
    render: ({ setup, variant }) => <TrendInspector setup={setup} variant={variant} />,
  },
  {
    id: "event",
    labelKey: "perception.ringTabs.event",
    isVisible: (setup) =>
      typeof setup.rings?.eventScore === "number" ||
      (setup.eventContext?.topEvents?.length ?? 0) > 0,
    render: ({ setup, variant }) => <EventInspector setup={setup} variant={variant} />,
  },
  {
    id: "bias",
    labelKey: "perception.ringTabs.bias",
    isVisible: (setup) => typeof setup.rings?.biasScore === "number",
    render: ({ setup, variant }) => <BiasInspector setup={setup} variant={variant} />,
  },
  {
    id: "sentiment",
    labelKey: "perception.ringTabs.sentiment",
    isVisible: (setup) => setup.sentiment?.score !== undefined,
    render: ({ setup, variant }) => (
      <SentimentInspector
        sentiment={setup.sentiment ?? null}
        variant={variant === "compact" ? "compact" : "default"}
      />
    ),
  },
  {
    id: "orderflow",
    labelKey: "perception.ringTabs.orderflow",
    isVisible: hasOrderflowContent,
    render: ({ setup, variant }) => <OrderflowInspector setup={setup} variant={variant} />,
  },
];

const DEFAULT_FRAME_CLASS = "rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4";
const STACK_CLASS = "space-y-3";

export function RingInsightTabs({
  setup,
  variant = "full",
  showSignalQualityInline = true,
  activeRing = null,
  onActiveRingChange,
  showTabButtons = true,
  frameClassName,
  hideEventTab = false,
}: RingInsightTabsProps) {
  const t = useT();
  const signalQuality = useMemo(() => computeSignalQuality(setup), [setup]);
  const availableTabs = useMemo(
    () => ringTabs.filter((tab) => tab.isVisible(setup) && !(hideEventTab && tab.id === "event")),
    [setup, hideEventTab],
  );

  const [selectedTab, setSelectedTab] = useState<RingTabId | null>(null);

  useEffect(() => {
    if (!onActiveRingChange || !availableTabs.length) return;
    if (activeRing && availableTabs.some((tab) => tab.id === activeRing)) {
      return;
    }
    const fallback = availableTabs[0]?.id ?? null;
    if (fallback && activeRing !== fallback) {
      onActiveRingChange(fallback);
    }
  }, [activeRing, onActiveRingChange, availableTabs]);

  const activeTab = useMemo(() => {
    const candidate = activeRing ?? selectedTab;
    if (candidate && availableTabs.some((tab) => tab.id === candidate)) {
      return candidate;
    }
    if (!availableTabs.length) {
      return null;
    }
    return availableTabs[0]?.id ?? null;
  }, [availableTabs, selectedTab, activeRing]);

  if (availableTabs.length === 0 || !activeTab) {
    return null;
  }

  const activeConfig =
    availableTabs.find((tab) => tab.id === activeTab) ?? availableTabs[0];
  const content = activeConfig?.render({ setup, variant });

  const handleSelect = (id: RingTabId) => {
    setSelectedTab(id);
    if (onActiveRingChange) {
      onActiveRingChange(id);
    }
  };

  const inner = (
    <div className={STACK_CLASS}>
      {variant === "full" && showSignalQualityInline && (
        <SignalQualityBadge quality={signalQuality} variant="inline" />
      )}
      {showTabButtons && (
        <div className="flex flex-wrap gap-2">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              className={`rounded-full border px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.3em] transition ${
                activeTab === tab.id
                  ? "bg-slate-800/70 text-slate-50 border-slate-600 shadow-[0_4px_18px_rgba(15,23,42,0.45)]"
                  : "bg-transparent text-slate-400 border-transparent hover:border-slate-700/70"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      )}
      {content}
    </div>
  );

  if (frameClassName === null) {
    return inner;
  }

  return <section className={clsx(DEFAULT_FRAME_CLASS, frameClassName)}>{inner}</section>;
}
