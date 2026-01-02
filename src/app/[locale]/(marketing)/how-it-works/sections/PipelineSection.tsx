import type { JSX } from "react";
import type { PipelineStep } from "../content";
import { SectionShell } from "./SectionShell";

type PipelineSectionProps = {
  title: string;
  intro: string;
  steps: PipelineStep[];
  labels: {
    step: string;
    snapshot: string;
    output: string;
  };
};

export function PipelineSection({
  title,
  intro,
  steps,
  labels,
}: PipelineSectionProps): JSX.Element {
  return (
    <SectionShell id="pipeline" title={title} description={intro}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.id}
            className="flex h-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[0.65rem] font-semibold text-slate-100">
                {`${labels.step} ${index + 1}`}
              </span>
              <span className="text-[0.65rem] text-slate-400">{labels.snapshot}</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">{step.title}</h3>
              <ul className="space-y-1 text-sm text-slate-200">
                {step.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-auto rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200">
              <span className="font-semibold text-emerald-300">{labels.output}:</span>{" "}
              <span>{step.output}</span>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
