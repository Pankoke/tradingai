"use client";

import { useMemo, useState, type JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { toSetupViewModel } from "@/src/components/perception/setupViewModel/toSetupViewModel";
import { SetupUnifiedCard } from "@/src/components/perception/setupViewModel/SetupUnifiedCard";

type Props = {
  setup: HomepageSetup;
  weakLabel: string;
  labels: {
    sourceRuleBased: string;
  };
};

const baseCardClass =
  "flex h-full flex-col justify-between rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_rgba(4,7,15,0.98)] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] md:px-8 md:py-8";

export default function HomepageSetupCard({ setup, weakLabel, labels }: Props): JSX.Element {
  const t = useT();
  const vm = useMemo(() => toSetupViewModel(setup), [setup]);
  const [expanded, setExpanded] = useState(false);
  const typeLabel = setup.weakSignal ? `${labels.sourceRuleBased} • ${weakLabel}` : labels.sourceRuleBased;

  return (
    <div className={baseCardClass}>
      <SetupUnifiedCard vm={{ ...vm, type: vm.type ?? null }} mode="list" defaultExpanded={expanded} />
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-slate-100 transition hover:border-slate-500"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? t("perception.setup.details.showLess") : t("perception.setup.details.showMore")}
        </button>
      </div>
    </div>
  );
}
