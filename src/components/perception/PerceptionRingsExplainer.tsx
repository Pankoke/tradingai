"use client";

import { useT } from "@/src/lib/i18n/ClientProvider";
import type { JSX } from "react";

type RingExplainer = {
  key: string;
  title: string;
  description: string;
};

export function PerceptionRingsExplainer(): JSX.Element {
  const t = useT();
  const rings: RingExplainer[] = [
    { key: "trend", title: t("perception.rings.title.trend"), description: t("perception.rings.desc.trend") },
    { key: "event", title: t("perception.rings.title.event"), description: t("perception.rings.desc.event") },
    { key: "bias", title: t("perception.rings.title.bias"), description: t("perception.rings.desc.bias") },
    { key: "sentiment", title: t("perception.rings.title.sentiment"), description: t("perception.rings.desc.sentiment") },
    { key: "orderflow", title: t("perception.rings.title.orderflow"), description: t("perception.rings.desc.orderflow") },
    { key: "confidence", title: t("perception.rings.title.confidence"), description: t("perception.rings.desc.confidence") },
  ];

  return (
    <section className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("perception.rings.explainerTitle")}</p>
      <h2 className="mt-1 text-2xl font-semibold text-white">{t("perception.rings.explainerHeadline")}</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("perception.rings.explainerIntro")}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rings.map((ring) => (
          <article key={ring.key} className="rounded-xl border border-slate-800 bg-[#0a1224]/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">{ring.title}</h3>
            <p className="mt-2 text-sm text-white">{ring.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
