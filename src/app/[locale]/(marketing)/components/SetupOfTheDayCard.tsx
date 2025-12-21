"use client";

import type { JSX } from "react";
import type { Setup } from "@/src/lib/engine/types";
import type { SetupCardSetup } from "./SetupCard";
import { toSetupViewModel } from "@/src/components/perception/setupViewModel/toSetupViewModel";
import { SetupUnifiedCard } from "@/src/components/perception/setupViewModel/SetupUnifiedCard";
import { OnboardingTourProvider } from "@/src/components/perception/OnboardingTour";

type SetupOfTheDayCardProps = {
  setup: SetupCardSetup;
  generatedAt?: string;
};

export function SetupOfTheDayCard({ setup, generatedAt }: SetupOfTheDayCardProps): JSX.Element {
  return (
    <OnboardingTourProvider>
      <SetupOfTheDayCardInner setup={setup as unknown as Setup} generatedAt={generatedAt} />
    </OnboardingTourProvider>
  );
}

function SetupOfTheDayCardInner({ setup, generatedAt }: { setup: Setup; generatedAt?: string }): JSX.Element {
  const vm = toSetupViewModel(setup, { generatedAt });
  return (
    <div className="w-full">
      <SetupUnifiedCard vm={vm} mode="sotd" setupOriginal={setup} />
    </div>
  );
}
