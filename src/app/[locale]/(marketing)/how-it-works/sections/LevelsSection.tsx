import type { JSX } from "react";
import type { LevelConcept } from "../content";
import { SectionShell } from "./SectionShell";

type LevelDiagramLabels = {
  diagramTitle: string;
  entry: string;
  stop: string;
  tp1: string;
  tp2: string;
  rrr: string;
  exampleTag: string;
  ruleNote: string;
};

type LevelsSectionProps = {
  title: string;
  intro: string;
  concepts: LevelConcept[];
  diagramLabels: LevelDiagramLabels;
  rrrLine: string;
};

export function LevelsSection({
  title,
  intro,
  concepts,
  diagramLabels,
  rrrLine,
}: LevelsSectionProps): JSX.Element {
  return (
    <SectionShell id="levels" title={title} description={intro}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-3 sm:grid-cols-2">
          {concepts.map((concept) => (
            <article
              key={concept.title}
              className="h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <h3 className="text-base font-semibold text-white">{concept.title}</h3>
              <p className="mt-2 leading-relaxed">{concept.description}</p>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-400">
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[0.68rem] font-semibold text-slate-100">
              {diagramLabels.exampleTag}
            </span>
            <span>{diagramLabels.diagramTitle}</span>
          </div>

          <div className="mt-4 space-y-3">
            <LevelRow label={diagramLabels.tp2} value="2,085" tone="positive" />
            <LevelRow label={diagramLabels.tp1} value="2,060" tone="positive" />
            <LevelRow label={diagramLabels.entry} value="2,032 – 2,038" tone="neutral" />
            <LevelRow label={diagramLabels.stop} value="2,012" tone="negative" />
          </div>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200">
            <p className="font-semibold text-emerald-300">{diagramLabels.rrr}</p>
            <p className="mt-1 leading-relaxed">{rrrLine}</p>
          </div>
          <p className="mt-3 text-xs text-slate-400">{diagramLabels.ruleNote}</p>
        </div>
      </div>
    </SectionShell>
  );
}

function LevelRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative";
}): JSX.Element {
  const toneClass =
    tone === "positive"
      ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-200"
      : tone === "negative"
        ? "bg-rose-500/10 border-rose-400/40 text-rose-200"
        : "bg-slate-800 border-slate-700 text-slate-100";

  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${toneClass}`}>
      <span className="font-semibold">{label}</span>
      <span className="text-xs tracking-tight text-slate-200">{value}</span>
    </div>
  );
}
