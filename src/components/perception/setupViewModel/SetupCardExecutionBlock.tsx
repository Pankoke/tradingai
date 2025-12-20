"use client";

import type { JSX } from "react";
import { classifyTradeSignal } from "@/src/components/perception/PrimaryTradeSignal";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { useT } from "@/src/lib/i18n/ClientProvider";

type ExecutionSignal = ReturnType<typeof classifyTradeSignal>;

type Props = {
  setup: SetupViewModel;
  chips: string[];
  bullets: string[];
  signal?: ExecutionSignal;
};

export function SetupCardExecutionBlock({ setup, chips, bullets, signal }: Props): JSX.Element {
  const t = useT();
  const resolvedSignal = signal ?? classifyTradeSignal(setup as unknown as Parameters<typeof classifyTradeSignal>[0]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[0.58rem] uppercase tracking-[0.3em] text-slate-400">
            {t("perception.execution.title")}
          </p>
          <p className="text-lg font-semibold text-white">{t(`perception.tradeDecision.signal.${resolvedSignal}.label`)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-200"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <ul className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
        {bullets.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
