"use client";

import React from "react";
import type { JSX } from "react";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";
import { AppShell } from "@/src/components/layout/AppShell";

export default function Page(): JSX.Element {
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  if (!isPro) {
    return (
      <AppShell section="backtesting">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <ProNotice context="backtesting" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell section="backtesting">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Replay-Modus</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
          Hier wird später der Replay-Modus folgen, um Setups in historischen Märkten nachzuspielen.
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Dieses Modul bleibt Pro-Mitgliedern vorbehalten, sobald es live geht.
        </p>
      </div>
    </AppShell>
  );
}
