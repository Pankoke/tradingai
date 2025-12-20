"use client";

import { useMemo, useState, type JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { toSetupViewModel } from "@/src/components/perception/setupViewModel/toSetupViewModel";
import { SetupRenderer } from "@/src/components/perception/setupViewModel/SetupRenderer";
import { SetupActionCards, buildActionCardData } from "@/src/components/perception/setupViewModel/SetupActionCards";

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
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
    [],
  );
  const actionCardData = useMemo(
    () =>
      buildActionCardData(vm, numberFormatter, {
        copyLabels: {
          copy: t("setups.action.copy"),
          copied: t("setups.action.copied"),
        },
      }),
    [vm, numberFormatter, t],
  );

  const variant = expanded ? "full" : "compact";

  return (
    <div className={baseCardClass}>
      <SetupRenderer
        vm={vm}
        variant={variant}
        headerTypeLabel={typeLabel}
        hideEventContext={!expanded}
        hideExecution={false}
        maxExecutionBullets={expanded ? null : 1}
      />
      <div className="mt-4">
        <SetupActionCards
          entry={actionCardData.entry}
          stop={actionCardData.stop}
          takeProfit={actionCardData.takeProfit}
          copyLabels={actionCardData.copyLabels}
          variant={expanded ? "full" : "mini"}
        />
      </div>
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
