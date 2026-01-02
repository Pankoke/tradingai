import type { JSX } from "react";
import type { ProfileCard } from "../content";
import { SectionShell } from "./SectionShell";

type ProfilesSectionProps = {
  title: string;
  intro: string;
  profiles: ProfileCard[];
  labels: {
    holding: string;
    scoring: string;
    freshness: string;
  };
};

export function ProfilesSection({
  title,
  intro,
  profiles,
  labels,
}: ProfilesSectionProps): JSX.Element {
  return (
    <SectionShell id="profiles" title={title} description={intro}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => (
          <article
            key={profile.id}
            className="flex h-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  {profile.timeframe}
                </p>
                <h3 className="text-lg font-semibold text-white">{profile.title}</h3>
              </div>
              <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {profile.purpose}
              </span>
            </header>

            <div className="space-y-2 text-sm text-slate-200">
              <Row label={labels.holding}>{profile.holding}</Row>
              <Row label={labels.scoring}>{profile.scoring}</Row>
              <Row label={labels.freshness}>{profile.freshness}</Row>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

function Row({ label, children }: { label: string; children: string }): JSX.Element {
  return (
    <div>
      <p className="text-[0.68rem] uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p>{children}</p>
    </div>
  );
}
