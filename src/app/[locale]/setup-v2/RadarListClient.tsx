"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { RadarCopy } from "@/src/app/[locale]/setup-v2/radar-copy";

export type RadarItem = {
  id: string;
  symbol: string;
  assetLabel: string;
  timeframe: string;
  context: "long" | "short" | "neutral";
  contextLabel: string;
  alignmentIndex: number;
  conflictLevel: "low" | "moderate" | "high";
  conflictLabel: string;
  asOfLabel: string;
  freshnessMinutes: number | null;
  attentionScore: number;
};

type Props = {
  locale: string;
  copy: RadarCopy;
  items: RadarItem[];
};

type SortKey = "attention" | "alignment" | "conflict" | "freshness";
type ConflictFilter = "all" | "low" | "moderate" | "high";
type ContextFilter = "all" | "long" | "short";

function conflictRank(level: RadarItem["conflictLevel"]): number {
  if (level === "high") return 3;
  if (level === "moderate") return 2;
  return 1;
}

function formatFreshness(minutes: number | null, copy: RadarCopy): string {
  if (minutes === null || Number.isNaN(minutes)) return copy.fields.asOf + " -";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

function conflictTone(level: RadarItem["conflictLevel"]): string {
  if (level === "high") return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  if (level === "moderate") return "border-sky-300/40 bg-sky-300/10 text-sky-100";
  return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
}

export function RadarListClient({ locale, copy, items }: Props): JSX.Element {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("attention");
  const [timeframe, setTimeframe] = useState("all");
  const [conflict, setConflict] = useState<ConflictFilter>("all");
  const [context, setContext] = useState<ContextFilter>("all");

  const timeframeOptions = useMemo(() => {
    const values = Array.from(new Set(items.map((item) => item.timeframe))).sort();
    return ["all", ...values];
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesSearch =
        q.length === 0 ||
        item.symbol.toLowerCase().includes(q) ||
        item.assetLabel.toLowerCase().includes(q);
      const matchesTimeframe = timeframe === "all" || item.timeframe === timeframe;
      const matchesConflict = conflict === "all" || item.conflictLevel === conflict;
      const matchesContext = context === "all" || item.context === context;
      return matchesSearch && matchesTimeframe && matchesConflict && matchesContext;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "alignment") return b.alignmentIndex - a.alignmentIndex;
      if (sort === "conflict") return conflictRank(b.conflictLevel) - conflictRank(a.conflictLevel);
      if (sort === "freshness") {
        const aAge = a.freshnessMinutes ?? Number.POSITIVE_INFINITY;
        const bAge = b.freshnessMinutes ?? Number.POSITIVE_INFINITY;
        return aAge - bAge;
      }
      return b.attentionScore - a.attentionScore;
    });
    return sorted;
  }, [items, search, timeframe, conflict, context, sort]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.controls.searchPlaceholder}
            className="rounded-lg border border-slate-700 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 lg:col-span-2"
          />
          <ControlSelect
            label={copy.controls.sortLabel}
            value={sort}
            onChange={(value) => setSort(value as SortKey)}
            options={[
              { value: "attention", label: copy.controls.sorts.attention },
              { value: "alignment", label: copy.controls.sorts.alignment },
              { value: "conflict", label: copy.controls.sorts.conflict },
              { value: "freshness", label: copy.controls.sorts.freshness },
            ]}
          />
          <ControlSelect
            label={copy.controls.timeframeLabel}
            value={timeframe}
            onChange={setTimeframe}
            options={timeframeOptions.map((value) => ({
              value,
              label: value === "all" ? copy.controls.all : value,
            }))}
          />
          <ControlSelect
            label={copy.controls.conflictLabel}
            value={conflict}
            onChange={(value) => setConflict(value as ConflictFilter)}
            options={[
              { value: "all", label: copy.controls.all },
              { value: "high", label: copy.conflict.high },
              { value: "moderate", label: copy.conflict.moderate },
              { value: "low", label: copy.conflict.low },
            ]}
          />
        </div>
        <div className="mt-3 max-w-xs">
          <ControlSelect
            label={copy.controls.contextLabel}
            value={context}
            onChange={(value) => setContext(value as ContextFilter)}
            options={[
              { value: "all", label: copy.controls.all },
              { value: "long", label: copy.context.long },
              { value: "short", label: copy.context.short },
            ]}
          />
        </div>
      </section>

      <section className="space-y-3">
        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-4 text-sm text-slate-300">
            {copy.empty}
          </div>
        ) : (
          visibleItems.map((item) => (
            <Link
              key={item.id}
              href={`/${locale}/setup-v2/${item.id}`}
              className="block rounded-2xl border border-slate-700/70 bg-slate-900/40 p-4 transition hover:border-slate-500/70 hover:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{item.symbol}</h2>
                  <p className="text-xs text-slate-400">{item.assetLabel}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{item.timeframe}</div>
                  <div>{copy.fields.asOf}: {item.asOfLabel}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-slate-600/60 bg-black/20 px-2.5 py-1 text-slate-200">
                  {copy.fields.context}: {item.contextLabel}
                </span>
                <span className={`rounded-full border px-2.5 py-1 ${conflictTone(item.conflictLevel)}`}>
                  {copy.fields.conflict}: {item.conflictLabel}
                </span>
                <span className="rounded-full border border-slate-600/60 bg-black/20 px-2.5 py-1 text-slate-200">
                  {copy.fields.freshness}: {formatFreshness(item.freshnessMinutes, copy)}
                </span>
                <span className="rounded-full border border-slate-600/60 bg-black/20 px-2.5 py-1 text-slate-200">
                  {copy.fields.attention}
                </span>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{copy.fields.alignment}</span>
                  <span>{item.alignmentIndex}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500/80 via-cyan-400/80 to-emerald-400/80"
                    style={{ width: `${item.alignmentIndex}%` }}
                  />
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

function ControlSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}): JSX.Element {
  return (
    <label className="block text-xs text-slate-400">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-black/30 px-3 py-2 text-sm text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
