import type { JSX } from "react";
import type { FaqItem } from "../content";
import { SectionShell } from "./SectionShell";

type FaqSectionProps = {
  title: string;
  intro: string;
  items: FaqItem[];
};

export function FaqSection({ title, intro, items }: FaqSectionProps): JSX.Element {
  return (
    <SectionShell id="faq" title={title} description={intro}>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.id}
            className="group rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-slate-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
              <span>{item.question}</span>
              <span aria-hidden="true" className="text-xs text-slate-400 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="border-t border-slate-800 px-4 py-3 text-sm text-slate-200">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}
