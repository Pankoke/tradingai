"use client";

import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";

const STORAGE_KEY = "perception_onboarding_v1";

type TourStepId = "decision" | "drivers" | "details";

type OnboardingTourState = {
  activeStep: TourStepId | null;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
  isCompleted: boolean;
};

const OnboardingTourContext = createContext<OnboardingTourState | undefined>(undefined);

export function useOnboardingTour(): OnboardingTourState {
  const context = useContext(OnboardingTourContext);
  if (!context) {
    throw new Error("useOnboardingTour must be used within OnboardingTourProvider");
  }
  return context;
}

function markCompleted(): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, "completed");
  }
}

export function OnboardingTourProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isCompleted, setIsCompleted] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(STORAGE_KEY) === "completed";
  });
  const [activeStep, setActiveStep] = useState<TourStepId | null>(null);

  const startTour = useCallback(() => {
    if (isCompleted) return;
    setActiveStep("decision");
  }, [isCompleted]);

  const completeTour = useCallback(() => {
    setIsCompleted(true);
    setActiveStep(null);
    markCompleted();
  }, []);

  const nextStep = useCallback(() => {
    setActiveStep((prev) => {
      if (prev === "decision") return "drivers";
      if (prev === "drivers") return "details";
      if (prev === "details") {
        completeTour();
        return null;
      }
      return prev;
    });
  }, [completeTour]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const value = useMemo(
    () => ({ activeStep, startTour, nextStep, skipTour, isCompleted }),
    [activeStep, startTour, nextStep, skipTour, isCompleted],
  );

  return <OnboardingTourContext.Provider value={value}>{children}</OnboardingTourContext.Provider>;
}

type OnboardingHintProps = {
  stepId: TourStepId;
  title: string;
  description: string;
  children: ReactNode;
};

export function OnboardingHint({ stepId, title, description, children }: OnboardingHintProps): JSX.Element {
  const { activeStep, nextStep, skipTour } = useOnboardingTour();
  const t = useT();
  const isActive = activeStep === stepId;

  return (
    <div className="relative">
      {children}
      {isActive ? (
        <div className="pointer-events-auto absolute z-50 mt-2 w-72 rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.65)]">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
            <p className="text-xs text-slate-300">{description}</p>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={skipTour}
              className="rounded-md px-3 py-1 text-xs font-semibold text-slate-300 transition hover:text-white"
            >
              {t("perception.onboarding.skip")}
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="rounded-md bg-sky-500/80 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500"
            >
              {t("perception.onboarding.next")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
