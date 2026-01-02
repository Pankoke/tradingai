import type { JSX } from "react";
import type { DataSourceItem } from "../content";
import { SectionShell } from "./SectionShell";

type DataSourcesSectionProps = {
  title: string;
  intro: string;
  items: DataSourceItem[];
  labels: {
    what: string;
    usedFor: string;
    quality: string;
  };
};

export function DataSourcesSection({
  title,
  intro,
  items,
  labels,
}: DataSourcesSectionProps): JSX.Element {
  return (
    <SectionShell id="data-sources" title={title} description={intro}>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.id}
            className="group rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-300">{item.summary}</p>
              </div>
              <span aria-hidden="true" className="text-xs text-slate-400 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="space-y-3 border-t border-slate-800 px-4 py-3 text-sm text-slate-200">
              <InfoRow label={labels.what} value={item.whatItIs} />
              <InfoRow label={labels.usedFor} value={item.usedFor} />
              <InfoRow label={labels.quality} value={item.quality} />
            </div>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p>{value}</p>
    </div>
  );
}
