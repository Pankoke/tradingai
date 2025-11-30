import type { JSX } from "react";

type Props = {
  t: (key: string) => string;
};

const RINGS = [
  { labelKey: "perception.today.eventRing", descKey: "perception.rings.explainer.event" },
  { labelKey: "perception.today.biasRing", descKey: "perception.rings.explainer.bias" },
  { labelKey: "perception.today.sentimentRing", descKey: "perception.rings.explainer.sentiment" },
  { labelKey: "perception.today.orderflowRing", descKey: "perception.rings.explainer.orderflow" },
  { labelKey: "perception.today.confidenceRing", descKey: "perception.rings.explainer.confidence" },
];

export function FiveRingsExplainer({ t }: Props): JSX.Element {
  return (
    <section className="rounded-3xl border border-slate-800 bg-[var(--bg-surface)] px-6 py-6 text-sm text-slate-300 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          {t("perception.rings.explainerTitle")}
        </p>
        <p className="text-lg font-semibold text-white">{t("perception.rings.explainerIntro")}</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {RINGS.map((ring) => (
          <div key={ring.labelKey} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {t(ring.labelKey)}
            </p>
            <p className="mt-2 text-[0.75rem] text-slate-400">{t(ring.descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
