import React, { Suspense } from "react";
import type { JSX } from "react";
import { SetupCard } from "../../(marketing)/components/SetupCard";
import { PremiumControls } from "@/src/components/setups/PremiumControls";
import { EngineMetaPanel } from "@/src/components/perception/EngineMetaPanel";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { Setup } from "@/src/lib/engine/types";
import { mockEvents } from "@/src/lib/mockEvents";

type PageProps = {
  searchParams?: {
    sort?: string;
    dir?: string;
    filter?: string;
  };
};

function applyFilter(setups: Setup[], filter: string): Setup[] {
  if (filter === "long") return setups.filter((s) => s.direction === "Long");
  if (filter === "short") return setups.filter((s) => s.direction === "Short");
  return setups;
}

function applySort(setups: Setup[], sort: string, dir: string): Setup[] {
  const direction = dir === "asc" ? 1 : -1;
  const cloned = [...setups];
  return cloned.sort((a, b) => {
    if (sort === "confidence") return (a.confidence - b.confidence) * direction;
    if (sort === "sentiment") return (a.sentimentScore - b.sentimentScore) * direction;
    if (sort === "timeframe") return a.timeframe.localeCompare(b.timeframe) * direction;
    if (sort === "direction") return a.direction.localeCompare(b.direction) * direction;
    return (a.confidence - b.confidence) * direction;
  });
}

export default async function PremiumSetupsPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const snapshot = await buildPerceptionSnapshot();
  const { setups } = snapshot;
  const events = mockEvents;

  const sort = searchParams?.sort ?? "confidence";
  const dir = searchParams?.dir ?? "desc";
  const filter = searchParams?.filter ?? "all";

  const filtered = applyFilter(setups, filter);
  const sorted = applySort(filtered, sort, dir);

  return (
    <div className="bg-[#0b0f14] text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:py-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Premium Setups</h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Zugriff auf alle heutigen Setups. Filter, Historie und Alerts folgen im Premium-Bereich.
          </p>
        </div>

        <EngineMetaPanel
          generatedAt={snapshot.generatedAt}
          version={snapshot.version}
          universe={snapshot.universe}
        />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-100 font-semibold">Events & Bias</span>
            <span>
              Heute {events.length} relevante Events. High-Impact-Events und Bias fließen ins Ranking ein.
            </span>
            <a
              href="/perception"
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-100 hover:bg-slate-800"
            >
              Mehr erfahren
            </a>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
              Lädt Filter ...
            </div>
          }
        >
          <PremiumControls currentSort={sort} currentDir={dir} currentFilter={filter} />
        </Suspense>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((setup) => (
            <SetupCard key={setup.id} setup={setup} />
          ))}
        </div>
      </div>
    </div>
  );
}
