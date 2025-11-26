"use client";

import React from "react";
import type { JSX } from "react";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";

export default function Page(): JSX.Element {
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  if (!isPro) {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <ProNotice context="backtesting" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Setup-Historie</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
          Platzhalter für die Historie vergangener Setups mit Filter- und Suchfunktionen.
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Weitere Backtesting-Module folgen. Als Pro-Mitglied siehst du hier die neuen Funktionen zuerst.
        </p>
      </div>
    </div>
  );
}
