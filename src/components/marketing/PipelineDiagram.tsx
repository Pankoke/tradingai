import type { JSX } from "react";

type Locale = "en" | "de";
type Variant = "surface" | "embedded";

type Step = {
  index: number;
  title: string;
  subtitle?: string;
};

const STEP_COPY: Record<Locale, Step[]> = {
  en: [
    { index: 1, title: "Data", subtitle: "Candles, events, sentiment" },
    { index: 2, title: "Features", subtitle: "Normalized signal layers" },
    { index: 3, title: "Ring Scores", subtitle: "0-100 structural scores" },
    { index: 4, title: "Playbooks", subtitle: "Asset/profile mapping" },
    { index: 5, title: "Snapshot", subtitle: "Timestamped publication" },
  ],
  de: [
    { index: 1, title: "Daten", subtitle: "Kerzen, Events, Sentiment" },
    { index: 2, title: "Features", subtitle: "Normalisierte Signal-Layer" },
    { index: 3, title: "Ring-Scores", subtitle: "0-100 Strukturwerte" },
    { index: 4, title: "Playbooks", subtitle: "Asset/Profil-Zuordnung" },
    { index: 5, title: "Snapshot", subtitle: "Zeitgestempelte Publikation" },
  ],
};

export default function PipelineDiagram({
  locale = "en",
  variant = "embedded",
}: {
  locale?: Locale;
  variant?: Variant;
}): JSX.Element {
  const copy = STEP_COPY[locale];
  const rowOne = copy.slice(0, 3);
  const rowTwo = copy.slice(3, 5);
  const isSurface = variant === "surface";

  return (
    <div
      className={`relative overflow-hidden ${
        isSurface
          ? "rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-3"
          : "bg-transparent px-0 py-0"
      }`}
    >
      {isSurface ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(56,189,248,0.14),transparent_52%),radial-gradient(circle_at_82%_78%,rgba(16,185,129,0.12),transparent_48%)]" />
      ) : null}
      <div className="relative space-y-2.5">
        <PipelineRow steps={rowOne} columns={3} variant={variant} />
        <PipelineRow steps={rowTwo} columns={2} variant={variant} />
      </div>
    </div>
  );
}

function PipelineRow({
  steps,
  columns,
  variant,
}: {
  steps: Step[];
  columns: 2 | 3;
  variant: Variant;
}): JSX.Element {
  const gridClass = columns === 3 ? "grid-cols-3" : "grid-cols-2";
  const isSurface = variant === "surface";
  return (
    <div className={`relative grid ${gridClass} gap-2`}>
      <div
        className={`pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 border-t ${
          isSurface ? "border-slate-600/60" : "border-slate-600/40"
        }`}
      />
      {steps.map((step) => (
        <article
          key={step.index}
          className={`relative min-w-0 text-center ${
            isSurface
              ? "rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
              : "rounded-md border border-slate-700/45 bg-slate-900/30 px-2 py-1.5"
          }`}
        >
          <div
            className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
              isSurface
                ? "border-slate-500/80 bg-slate-950 text-slate-100"
                : "border-slate-500/70 bg-slate-900/70 text-slate-200"
            }`}
          >
            {step.index}
          </div>
          <p className={`mt-1 text-[11px] font-semibold leading-tight ${isSurface ? "text-slate-100" : "text-slate-200"}`}>
            {step.title}
          </p>
          {step.subtitle ? (
            <p className={`mt-0.5 leading-tight ${isSurface ? "text-[10px] text-slate-400" : "text-[9px] text-slate-500"}`}>
              {step.subtitle}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
