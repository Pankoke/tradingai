"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import type { Setup } from "@/src/lib/engine/types";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";
import {
  SnapshotSetupCard,
  type RingKey,
  type SnapshotSetupMessages,
  type SnapshotSetupRankInfo,
} from "@/src/components/admin/SnapshotSetupCard";

type SetupRow = {
  setup: Setup;
  rank?: SnapshotSetupRankInfo;
};

type SortValue = "qualityDesc" | "qualityAsc" | "confidenceDesc" | "trendDesc" | "eventDesc" | "symbolAsc";

type SnapshotSetupListMessages = {
  sortLabel: string;
  sortQualityDesc: string;
  sortQualityAsc: string;
  sortConfidenceDesc: string;
  sortTrendDesc: string;
  sortEventDesc: string;
  sortSymbolAsc: string;
  expandAll: string;
  collapseAll: string;
  summary: string;
};

type Props = {
  setups: SetupRow[];
  ringLabels: Record<RingKey, string>;
  setupMessages: SnapshotSetupMessages;
  listMessages: SnapshotSetupListMessages;
};

const gradeWeight: Record<SignalQuality["grade"], number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
};

export function SnapshotSetupList({ setups, ringLabels, setupMessages, listMessages }: Props): JSX.Element {
  const [sortValue, setSortValue] = useState<SortValue>("qualityDesc");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    return setups.map((entry) => {
      const quality = computeSignalQuality(entry.setup);
      const metrics = {
        confidence: entry.setup.confidence ?? entry.setup.rings?.confidenceScore ?? null,
        trend: entry.setup.rings?.trendScore ?? null,
        event: entry.setup.rings?.eventScore ?? null,
        symbol: entry.setup.symbol ?? "",
      };

      return {
        ...entry,
        quality,
        metrics,
      };
    });
  }, [setups]);

  useEffect(() => {
    setExpandedIds((prev) => {
      const next: Record<string, boolean> = {};
      for (const row of rows) {
        if (prev[row.setup.id]) {
          next[row.setup.id] = true;
        }
      }
      return next;
    });
  }, [rows]);

  const sortOptions: { value: SortValue; label: string }[] = [
    { value: "qualityDesc", label: listMessages.sortQualityDesc },
    { value: "qualityAsc", label: listMessages.sortQualityAsc },
    { value: "confidenceDesc", label: listMessages.sortConfidenceDesc },
    { value: "trendDesc", label: listMessages.sortTrendDesc },
    { value: "eventDesc", label: listMessages.sortEventDesc },
    { value: "symbolAsc", label: listMessages.sortSymbolAsc },
  ];

  const compareQuality = (a: SignalQuality | null | undefined, b: SignalQuality | null | undefined) => {
    const value = (quality?: SignalQuality | null) => {
      if (!quality) return -1;
      return gradeWeight[quality.grade] * 1000 + quality.score;
    };
    return value(a) - value(b);
  };

  const compareNumbers = (a?: number | null, b?: number | null) => {
    const av = typeof a === "number" && !Number.isNaN(a) ? a : -Infinity;
    const bv = typeof b === "number" && !Number.isNaN(b) ? b : -Infinity;
    return av - bv;
  };

  const sortedRows = useMemo(() => {
    const clone = [...rows];
    clone.sort((a, b) => {
      switch (sortValue) {
        case "qualityAsc":
          return compareQuality(a.quality, b.quality);
        case "confidenceDesc":
          return compareNumbers(b.metrics.confidence, a.metrics.confidence);
        case "trendDesc":
          return compareNumbers(b.metrics.trend, a.metrics.trend);
        case "eventDesc":
          return compareNumbers(b.metrics.event, a.metrics.event);
        case "symbolAsc":
          return (a.metrics.symbol || "").localeCompare(b.metrics.symbol || "");
        case "qualityDesc":
        default:
          return compareQuality(b.quality, a.quality);
      }
    });
    return clone;
  }, [rows, sortValue]);

  const summaryText = listMessages.summary
    .replace("{count}", rows.length.toString())
    .replace(
      "{label}",
      sortOptions.find((option) => option.value === sortValue)?.label ?? listMessages.sortQualityDesc,
    );

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const row of rows) {
      next[row.setup.id] = true;
    }
    setExpandedIds(next);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  const allExpanded = rows.length > 0 && rows.every((row) => expandedIds[row.setup.id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-400">{summaryText}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400">
            {listMessages.sortLabel}
            <select
              className="ml-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={sortValue}
              onChange={(event) => setSortValue(event.target.value as SortValue)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-100"
            onClick={allExpanded ? collapseAll : expandAll}
          >
            {allExpanded ? listMessages.collapseAll : listMessages.expandAll}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedRows.map((row) => (
          <SnapshotSetupCard
            key={row.setup.id}
            setup={row.setup}
            ringLabels={ringLabels}
            messages={setupMessages}
            rank={row.rank}
            quality={row.quality}
            expanded={!!expandedIds[row.setup.id]}
            onToggle={() => toggleExpanded(row.setup.id)}
          />
        ))}
      </div>
    </div>
  );
}
