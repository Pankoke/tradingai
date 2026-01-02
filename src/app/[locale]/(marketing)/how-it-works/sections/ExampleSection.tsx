import type { JSX } from "react";
import type { ExampleStep } from "../content";
import { SectionShell } from "./SectionShell";

type ExampleSectionProps = {
  title: string;
  intro: string;
  steps: ExampleStep[];
  eventNote: string;
  labels: {
    step: string;
    example: string;
  };
};

export function ExampleSection({
  title,
  intro,
  steps,
  eventNote,
  labels,
}: ExampleSectionProps): JSX.Element {
  return (
    <SectionShell id="example" title={title} description={intro}>
      <div className="space-y-4">
        <ol className="relative border-l border-slate-800">
          {steps.map((step, index) => (
            <li key={step.id} className="ml-6 space-y-1 py-3">
              <span
                aria-hidden="true"
                className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-2 border-slate-800 bg-emerald-400/80"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  {labels.step} {index + 1}
                </p>
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[0.7rem] text-slate-200">
                  {labels.example}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-slate-200">{step.description}</p>
              {step.note ? (
                <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100">
                  {step.note}
                </p>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          {eventNote}
        </div>
      </div>
    </SectionShell>
  );
}
