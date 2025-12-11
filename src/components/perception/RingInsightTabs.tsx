"use client";

import type { JSX } from "react";
import { useMemo, useState } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";
import { SentimentInspector } from "@/src/components/perception/SentimentInspector";
import { OrderflowInspector } from "@/src/components/perception/OrderflowInspector";
import { TrendInspector } from "@/src/components/perception/TrendInspector";
import { BiasInspector } from "@/src/components/perception/BiasInspector";
import { EventInspector } from "@/src/components/perception/EventInspector";

type RingTabId = "trend" | "event" | "bias" | "sentiment" | "orderflow";

type RingTabConfig = {
  id: RingTabId;
  labelKey: string;
  isVisible: (setup: Setup) => boolean;
  render: (params: { setup: Setup; variant: "full" | "compact" }) => JSX.Element | null;
};

type RingInsightTabsProps = {
  setup: Setup;
  variant?: "full" | "compact";
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

export function RingInsightTabs({ setup, variant = "full" }: RingInsightTabsProps) {
  const t = useT();
  const availableTabs = useMemo(
    () => ringTabs.filter((tab) => tab.isVisible(setup)),
    [setup],
  );

  const [selectedTab, setSelectedTab] = useState<RingTabId | null>(null);

  const activeTab = useMemo(() => {
    if (!availableTabs.length) {
      return null;
    }
    if (selectedTab && availableTabs.some((tab) => tab.id === selectedTab)) {
      return selectedTab;
    }
    return availableTabs[0]?.id ?? null;
  }, [availableTabs, selectedTab]);

  if (availableTabs.length === 0 || !activeTab) {
    return null;
  }

  const activeConfig =
    availableTabs.find((tab) => tab.id === activeTab) ?? availableTabs[0];
  const content = activeConfig?.render({ setup, variant });

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTab(tab.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              activeTab === tab.id
                ? "bg-slate-800 text-slate-50 border border-slate-700"
                : "bg-transparent text-slate-400 border border-slate-800/60"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      {content}
    </section>
  );
}
