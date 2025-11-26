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
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">KI-Backtesting</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
          Geplante KI-gestützte Backtesting-Umgebung für automatisierte Auswertungen und Scoring.
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Pro-Mitglieder erhalten hier als Erste Zugriff, sobald das Modul live geht.
        </p>
      </div>
    </div>
  );
}
