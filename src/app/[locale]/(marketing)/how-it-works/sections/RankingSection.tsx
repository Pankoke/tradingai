import type { JSX } from "react";
import type { RankingExample } from "../content";
import { SectionShell } from "./SectionShell";

type RankingSectionProps = {
  title: string;
  intro: string;
  listTitle: string;
  examples: RankingExample[];
  scoreLabel: string;
};

export function RankingSection({
  title,
  intro,
  listTitle,
  examples,
  scoreLabel,
}: RankingSectionProps): JSX.Element {
  return (
    <SectionShell id="ranking" title={title} description={intro}>
      <div className="space-y-4 text-sm text-slate-200">
        <p className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {listTitle}
        </p>
        <ul className="space-y-3">
          {examples.map((item, index) => (
            <li
              key={item.id}
              className={`rounded-2xl border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
                item.highlight
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                  : "border-slate-800 bg-slate-900/80 text-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-100">
                    {index + 1}
                  </span>
                <div className="space-y-1">
                  <p className="text-base font-semibold">{item.label}</p>
                    {item.badge ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[0.7rem] font-semibold text-emerald-100">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100">
                  {scoreLabel} {item.score}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
