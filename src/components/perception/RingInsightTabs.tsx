"use client";

import { useMemo, useState } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";
import { SentimentInspector } from "@/src/components/perception/SentimentInspector";
import { OrderflowInspector } from "@/src/components/perception/OrderflowInspector";

type RingTabId = "sentiment" | "orderflow";

type RingInsightTabsProps = {
  setup: Setup;
  variant?: "full" | "compact";
};

const tabLabelKey: Record<RingTabId, string> = {
  sentiment: "perception.ringTabs.sentiment",
  orderflow: "perception.ringTabs.orderflow",
};

export function RingInsightTabs({ setup, variant = "full" }: RingInsightTabsProps) {
  const t = useT();
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
  const availableTabs = useMemo<RingTabId[]>(() => {
    const items: RingTabId[] = [];
    if (setup.sentiment?.score !== undefined) {
      items.push("sentiment");
    }
    if (hasOrderflowContent(setup)) {
      items.push("orderflow");
    }
    return items;
  }, [setup]);

  if (availableTabs.length === 0) {
    return null;
  }

  const [activeTab, setActiveTab] = useState<RingTabId>(availableTabs[0]);

  const sentimentVariant = variant === "compact" ? "compact" : "default";

  const renderContent = () => {
    if (activeTab === "sentiment") {
      return (
        <SentimentInspector
          sentiment={setup.sentiment ?? null}
          variant={sentimentVariant}
        />
      );
    }
    if (activeTab === "orderflow") {
      return <OrderflowInspector setup={setup} variant={variant} />;
    }
    return null;
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              activeTab === tab
                ? "bg-slate-800 text-slate-50 border border-slate-700"
                : "bg-transparent text-slate-400 border border-slate-800/60"
            }`}
          >
            {t(tabLabelKey[tab])}
          </button>
        ))}
      </div>
      {renderContent()}
    </section>
  );
}
