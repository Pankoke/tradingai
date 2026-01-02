import type { JSX } from "react";
import type { RingItem } from "../content";
import { SectionShell } from "./SectionShell";

type RingsSectionProps = {
  title: string;
  intro: string;
  rings: RingItem[];
  qualityNote: string;
  transparencyLabel: string;
  labels: {
    meaning: string;
    inputs: string;
    interpretation: string;
    quality: string;
  };
};

export function RingsSection({
  title,
  intro,
  rings,
  qualityNote,
  transparencyLabel,
  labels,
}: RingsSectionProps): JSX.Element {
  return (
    <SectionShell id="rings" title={title} description={intro}>
      <div className="grid gap-4 md:grid-cols-2">
        {rings.map((ring) => (
          <article
            key={ring.id}
            className="flex h-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  {ring.id}
                </p>
                <h3 className="text-lg font-semibold text-white">{ring.name}</h3>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[0.7rem] font-semibold text-emerald-200">
                0–100
              </span>
            </header>

            <div className="space-y-2">
              <Info label={labels.meaning} value={ring.meaning} />
              <Info label={labels.inputs} value={ring.inputs} />
              <Info label={labels.interpretation} value={ring.interpretation} />
              <Info label={labels.quality} value={ring.quality} />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <p>{qualityNote}</p>
        <a
          href="#faq"
          className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-sky-300 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          {transparencyLabel}
        </a>
      </div>
    </SectionShell>
  );
}

function Info({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="space-y-1">
      <p className="text-[0.7rem] uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p>{value}</p>
    </div>
  );
}
