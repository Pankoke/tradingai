"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n";
import { buildHref } from "./href";

type FilterProps = {
  locale: Locale;
  days: number;
  assetId?: string;
  playbookId?: string;
  playbookFilters: Array<{ value: string; label: string }>;
  showNoTradeType: boolean;
  includeAllGrades: boolean;
  includeNoTrade: boolean;
};

export function Filters({
  locale,
  days,
  assetId,
  playbookId,
  playbookFilters,
  showNoTradeType,
  includeAllGrades,
  includeNoTrade,
}: FilterProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span>Aktive Filter:</span>
        <span className="rounded bg-slate-800 px-2 py-1">days={days}</span>
        {playbookId ? (
          <span className="rounded bg-slate-800 px-2 py-1">playbook={playbookId}</span>
        ) : (
          <span className="rounded bg-slate-800 px-2 py-1">playbook=all</span>
        )}
        <span className="rounded bg-slate-800 px-2 py-1">{includeAllGrades ? "grades=all" : "grades=A/B"}</span>
        <span className="rounded bg-slate-800 px-2 py-1">{includeNoTrade ? "NO_TRADE=on" : "NO_TRADE=off"}</span>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/admin/outcomes?days=30`)}
          className="text-emerald-300 hover:underline"
        >
          Reset auf defaults
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {["7", "30", "90", "180", "365", "730"].map((value) => {
          const target = buildHref({
            locale,
            days: Number(value),
            assetId,
            playbookId,
            showNoTradeType,
            includeAllGrades,
            includeNoTrade,
          });
          const active = Number(value) === days;
          return (
            <button
              key={value}
              type="button"
              onClick={() => router.push(target)}
              className={`rounded-full px-3 py-1 font-semibold ${active ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"}`}
            >
              {value} Tage
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {playbookFilters.map((pb) => {
          const target = buildHref({
            locale,
            days,
            assetId,
            playbookId: pb.value || undefined,
            showNoTradeType,
            includeAllGrades,
            includeNoTrade,
          });
          const active = (pb.value || undefined) === (playbookId ?? undefined);
          return (
            <button
              key={pb.value || "all"}
              type="button"
              onClick={() => router.push(target)}
              className={`rounded-full px-3 py-1 font-semibold ${active ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"}`}
            >
              {pb.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() =>
            router.push(
              buildHref({
                locale,
                days,
                assetId,
                playbookId,
                showNoTradeType,
                includeAllGrades: !includeAllGrades || undefined,
                includeNoTrade,
              }),
            )
          }
          className={`rounded bg-slate-800 px-3 py-1 font-semibold ${includeAllGrades ? "text-emerald-300" : "text-slate-200"} hover:bg-slate-700`}
        >
          {includeAllGrades ? "Grades: A/B + weitere (an)" : "Grades: nur A/B (default)"}
        </button>
        <button
          type="button"
          onClick={() =>
            router.push(
              buildHref({
                locale,
                days,
                assetId,
                playbookId,
                showNoTradeType,
                includeAllGrades,
                includeNoTrade: !includeNoTrade || undefined,
              }),
            )
          }
          className={`rounded bg-slate-800 px-3 py-1 font-semibold ${includeNoTrade ? "text-emerald-300" : "text-slate-200"} hover:bg-slate-700`}
        >
          {includeNoTrade ? "NO_TRADE einblenden (an)" : "NO_TRADE ausblenden (default)"}
        </button>
      </div>
    </div>
  );
}
