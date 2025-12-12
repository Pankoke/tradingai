"use client";

import clsx from "clsx";
import { useState } from "react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";
import { TraderPlaybook } from "@/src/components/perception/TraderPlaybook";

type ImpactPlaybookCardProps = {
  summary: string;
  setup: Setup;
};

export function ImpactPlaybookCard({ summary, setup }: ImpactPlaybookCardProps): JSX.Element {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const trimmed = summary?.trim();
  const hasSummary = Boolean(trimmed);
  const displaySummary = hasSummary ? trimmed : t("perception.impactPlaybook.summaryFallback");

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]">
      <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
        {t("perception.impactPlaybook.heading")}
      </h3>
      <div className="space-y-1">
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
          {t("perception.setup.sections.aiSummary")}
        </p>
        <p
          className={clsx(
            "text-sm text-slate-200",
            expanded ? "whitespace-pre-line" : "line-clamp-2 text-pretty",
          )}
        >
          {displaySummary}
        </p>
        {hasSummary && (
          <button
            type="button"
            className="text-xs font-semibold text-sky-300 transition hover:text-sky-100"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? t("perception.impactPlaybook.showLess") : t("perception.impactPlaybook.showMore")}
          </button>
        )}
      </div>
      <TraderPlaybook setup={setup} />
    </div>
  );
}
