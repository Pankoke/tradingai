import React from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: string;
};

function FeatureCard({ title, description, icon }: FeatureCardProps): JSX.Element {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[0_10px_25px_rgba(0,0,0,0.2)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(34,197,94,0.08)] text-lg">
        <span aria-hidden="true">{icon}</span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-2 text-xs text-[var(--text-secondary)] sm:text-sm">{description}</p>
      </div>
    </article>
  );
}

export function Features(): JSX.Element {
  const t = useT();

  return (
    <section id="perception-lab" className="space-y-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-lg shadow-[rgba(0,0,0,0.25)] md:p-7">
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("features.title")}</h2>
        <div className="space-y-2 text-sm text-[var(--text-secondary)] sm:text-base">
          <p>{t("features.block1.text")}</p>
          <p>{t("features.block2.text")}</p>
          <p>{t("features.block4.text")}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard icon="⚡" title={t("features.block1.title")} description={t("features.block1.text")} />
        <FeatureCard icon="📊" title={t("features.block2.title")} description={t("features.block2.text")} />
        <FeatureCard icon="🧭" title={t("features.block3.title")} description={t("features.block3.text")} />
        <FeatureCard icon="🛡️" title={t("features.block4.title")} description={t("features.block4.text")} />
      </div>
    </section>
  );
}
