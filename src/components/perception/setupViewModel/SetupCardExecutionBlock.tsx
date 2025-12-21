"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";

type Props = {
  title: string;
  bullets: string[];
};

export function SetupCardExecutionBlock({ title, bullets }: Props): JSX.Element {
  const t = useT();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-1">
        <p className="text-[0.58rem] uppercase tracking-[0.3em] text-slate-400">
          {t("perception.execution.title")}
        </p>
        <p className="text-lg font-semibold text-white">{title}</p>
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
