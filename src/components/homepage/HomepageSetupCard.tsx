"use client";

import type { JSX } from "react";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { toSetupViewModel } from "@/src/components/perception/setupViewModel/toSetupViewModel";
import { SetupRenderer } from "@/src/components/perception/setupViewModel/SetupRenderer";

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
  const vm = toSetupViewModel(setup);
  const typeLabel = setup.weakSignal ? `${labels.sourceRuleBased} • ${weakLabel}` : labels.sourceRuleBased;

  return (
    <div className={baseCardClass}>
      <SetupRenderer vm={vm} variant="compact" headerTypeLabel={typeLabel} />
    </div>
  );
}
