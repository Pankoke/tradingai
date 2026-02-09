"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { Badge } from "@/src/components/ui/badge";
import { Tooltip } from "@/src/components/ui/tooltip";
import type { DecisionSummaryVM, SummaryBullet } from "@/src/features/perception/viewModel/decisionSummary";

type DecisionSummaryCardProps = {
  summary: DecisionSummaryVM;
  className?: string;
  compact?: boolean;
};

export function DecisionSummaryCard({ summary, className = "", compact = false }: DecisionSummaryCardProps): JSX.Element {
  const t = useT();
  const executionModeKey = `setup.decisionSummary.executionMode.${summary.executionMode}`;
  const interpretationText = resolveText(t(summary.interpretation.key), summary.interpretation.params);
  const shortDisclaimer = t("setup.decisionSummary.disclaimer.short");
  const longDisclaimer = t("setup.decisionSummary.disclaimer.long");

  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md ${compact ? "space-y-3" : "space-y-4"} ${className}`}
      aria-label={t("setup.decisionSummary.title")}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{t("setup.decisionSummary.title")}</h3>
        {summary.band ? (
          <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-800 px-2 py-0.5 text-[0.65rem] text-slate-100">
            {summary.band}
          </Badge>
        ) : null}
        <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-800 px-2 py-0.5 text-[0.65rem] text-slate-200">
          {t(executionModeKey)}
        </Badge>
      </header>

      <p className="line-clamp-2 text-sm text-slate-300">{interpretationText}</p>

      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        <SummaryList title={t("setup.decisionSummary.pros")} bullets={summary.pros} />
        <SummaryList title={t("setup.decisionSummary.cautions")} bullets={summary.cautions} />
      </div>

      {summary.reasonsAgainst && summary.reasonsAgainst.length > 0 ? (
        <SummaryList title={t("setup.decisionSummary.reasonsAgainst")} bullets={summary.reasonsAgainst} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2 text-xs text-slate-400">
        <span>{shortDisclaimer}</span>
        <Tooltip content={longDisclaimer}>
          <span className="inline-flex cursor-help rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[0.65rem] text-slate-200">
            i
          </span>
        </Tooltip>
      </div>
    </section>
  );

  function SummaryList({ title, bullets }: { title: string; bullets: SummaryBullet[] }): JSX.Element {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{title}</p>
        <ul className="space-y-1 text-sm text-slate-200">
          {bullets.map((item) => (
            <li key={`${title}-${item.key}`} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span>{resolveText(t(item.key), item.params)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

function resolveText(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
