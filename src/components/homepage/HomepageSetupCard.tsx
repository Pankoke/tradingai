"use client";

import { useMemo, type JSX } from "react";
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

export default function HomepageSetupCard({ setup }: Props): JSX.Element {
  const vm = useMemo(() => toSetupViewModel(setup), [setup]);

  return (
    <div className={baseCardClass}>
      <SetupUnifiedCard vm={{ ...vm, type: vm.type ?? null }} mode="list" defaultExpanded={false} />
    </div>
  );
}
