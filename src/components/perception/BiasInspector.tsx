"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type BiasInspectorProps = {
  setup: Setup;
  variant?: "full" | "compact";
  className?: string;
};

const bucketFromScore = (score: number) => {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

export function BiasInspector({ setup, className }: BiasInspectorProps): JSX.Element {
  const t = useT();
  const score = setup.rings?.biasScore ?? 50;
  const bucket = bucketFromScore(score);
  const direction = setup.direction ?? "Neutral";

  const directionText = t("perception.bias.directionLabel").replace(
    "{direction}",
    direction,
  );

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.4)] ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("perception.bias.heading")}
          </p>
          <p className="text-sm text-slate-200">
            {t("perception.rings.bucket." + bucket)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-white">{score}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            /100
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-300">
        <p>{directionText}</p>
        <p>{t("perception.bias.summary." + bucket)}</p>
      </div>
    </section>
  );
}
