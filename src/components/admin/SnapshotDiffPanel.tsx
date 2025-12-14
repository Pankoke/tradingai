"use client";

import { useCallback, useMemo, useState, type JSX } from "react";
import clsx from "clsx";
import type { Locale } from "@/i18n";
import type { SnapshotDiffResult, SnapshotDiffChange } from "@/src/server/admin/snapshotDiff";
import type { SetupDiffEntry } from "@/src/server/admin/snapshotDiff";
import { SNAPSHOT_SETUP_EXPAND_EVENT } from "@/src/components/admin/SnapshotSetupList";

export type SnapshotDiffClientResult = Omit<SnapshotDiffResult, "previousSnapshot"> & {
  previousSnapshot: Omit<SnapshotDiffResult["previousSnapshot"], "snapshotTime"> & {
    snapshotTime: string;
  };
};

export type SnapshotDiffMessages = {
  title: string;
  comparedTo: string;
  noPrevious: string;
  sectionAdded: string;
  sectionRemoved: string;
  sectionChanged: string;
  none: string;
  more: string;
  qualityLabel: string;
  topGainers: string;
  topLosers: string;
  significantOnly: string;
  thresholdHint: string;
  jump: string;
  topRingDeltas: string;
  symbolLabel: string;
  statusLabel: string;
  naLabel: string;
};

type Props = {
  diff: SnapshotDiffClientResult | null;
  locale: Locale;
  messages: SnapshotDiffMessages;
  ringDeltaLabelMap: Record<string, string>;
};

const QUALITY_THRESHOLD = 5;
const RING_THRESHOLD = 10;

const formatDateString = (value: string, locale: Locale): string => {
  const formatter = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return formatter.format(new Date(value));
};

const hasRingImpact = (change: SnapshotDiffChange): boolean => {
  const deltas = Object.values(change.ringDeltas ?? {}).filter(
    (value): value is number => typeof value === "number" && !Number.isNaN(value),
  );
  if (!deltas.length) return false;
  const maxDelta = Math.max(...deltas.map((value) => Math.abs(value)));
  return maxDelta >= RING_THRESHOLD;
};

const formatDelta = (value: number | null | undefined, fallback: string): string => {
  if (typeof value !== "number" || Number.isNaN(value) || value === 0) {
    return fallback;
  }
  return `${value > 0 ? "+" : ""}${value}`;
};

export function SnapshotDiffPanel({ diff, locale, messages, ringDeltaLabelMap }: Props): JSX.Element {
  const [significantOnly, setSignificantOnly] = useState(false);

  const handleNavigate = useCallback((matchKey: string | undefined) => {
    if (!matchKey) return;
    const anchor = document.getElementById(`setup-${matchKey}`);
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.dispatchEvent(
      new CustomEvent(SNAPSHOT_SETUP_EXPAND_EVENT, {
        detail: { matchKey },
      }),
    );
  }, []);

  const filteredChanged = useMemo(() => {
    if (!diff) return [];
    if (!significantOnly) return diff.changed;
    return diff.changed.filter((change) => {
      const qualityImpact = Math.abs(change.qualityDelta) >= QUALITY_THRESHOLD;
      return qualityImpact || hasRingImpact(change);
    });
  }, [diff, significantOnly]);

  const filteredTopGainers = useMemo(() => {
    if (!filteredChanged.length) return [];
    return [...filteredChanged]
      .filter((change) => change.qualityDelta > 0)
      .sort((a, b) => b.qualityDelta - a.qualityDelta)
      .slice(0, 5);
  }, [filteredChanged]);

  const filteredTopLosers = useMemo(() => {
    if (!filteredChanged.length) return [];
    return [...filteredChanged]
      .filter((change) => change.qualityDelta < 0)
      .sort((a, b) => a.qualityDelta - b.qualityDelta)
      .slice(0, 5);
  }, [filteredChanged]);

  const formatComparedText = () => {
    if (!diff) return "";
    const targetLabel = diff.previousSnapshot.label ?? diff.previousSnapshot.id;
    const formattedTime = formatDateString(diff.previousSnapshot.snapshotTime, locale);
    return messages.comparedTo.replace("{label}", targetLabel).replace("{time}", formattedTime);
  };

  const renderSetupInfo = (entry: SetupDiffEntry, clickable: boolean) => {
    const content = (
      <>
        <p className="font-semibold">
          {entry.setup.symbol} · {entry.setup.direction}
        </p>
        <p className="text-xs text-slate-400">{entry.setup.timeframe}</p>
      </>
    );
    if (!clickable) {
      return <div>{content}</div>;
    }
    return (
      <button
        type="button"
        onClick={() => handleNavigate(entry.matchKey)}
        className="w-full text-left transition hover:text-sky-200"
        aria-label={messages.jump}
      >
        {content}
      </button>
    );
  };

  const renderRingDeltas = (change: SnapshotDiffChange) => {
    const entries = Object.entries(change.ringDeltas ?? {})
      .filter(([, value]) => typeof value === "number" && value !== 0)
      .sort(([, a], [, b]) => Math.abs((b as number) ?? 0) - Math.abs((a as number) ?? 0))
      .slice(0, 3);
    if (entries.length === 0) {
      return <span className="text-xs text-slate-500">{messages.none}</span>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, value]) => (
          <span key={key} className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-100">
            {ringDeltaLabelMap[key] ?? key}:{" "}
            <span className={Number(value) >= 0 ? "text-emerald-300" : "text-rose-300"}>
              {formatDelta(Number(value), messages.naLabel)}
            </span>
          </span>
        ))}
      </div>
    );
  };

  const renderList = (label: string, entries: SetupDiffEntry[], clickable: boolean) => {
    const preview = entries.slice(0, 10);
    const extra = entries.length - preview.length;
    return (
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
        {preview.length === 0 ? (
          <p className="text-sm text-slate-500">{messages.none}</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-200">
            {preview.map((entry) => (
              <li
                key={entry.matchKey}
                className={clsx(
                  "rounded-lg border border-slate-800/70 bg-slate-900/40 p-2",
                  clickable && "hover:border-sky-500/60",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  {renderSetupInfo(entry, clickable)}
                  <span className="text-xs text-slate-400">
                    {messages.qualityLabel}: {entry.quality.grade} ({entry.quality.score})
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {extra > 0 && (
          <p className="text-xs text-slate-500">{messages.more.replace("{count}", extra.toString())}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{messages.title}</h2>
          {diff && <p className="text-sm text-slate-400">{formatComparedText()}</p>}
        </div>
        {diff && (
          <div className="flex flex-col gap-1 text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                checked={significantOnly}
                onChange={(event) => setSignificantOnly(event.target.checked)}
              />
              {messages.significantOnly}
            </label>
            {messages.thresholdHint && (
              <span className="text-[0.7rem] text-slate-500">{messages.thresholdHint}</span>
            )}
          </div>
        )}
      </div>

      {!diff ? (
        <p className="text-sm text-slate-400">{messages.noPrevious}</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {renderList(messages.sectionAdded, diff.added, true)}
            {renderList(messages.sectionRemoved, diff.removed, false)}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{messages.sectionChanged}</p>
            {filteredChanged.length === 0 ? (
              <p className="text-sm text-slate-500">{messages.none}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
                  <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">{messages.symbolLabel}</th>
                      <th className="px-4 py-3">{messages.qualityLabel}</th>
                      <th className="px-4 py-3">{messages.topRingDeltas}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {filteredChanged.slice(0, 10).map((change) => (
                      <tr key={change.matchKey}>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleNavigate(change.matchKey)}
                            className="text-left transition hover:text-sky-200"
                            aria-label={messages.jump}
                          >
                            <div className="font-semibold">{change.symbol}</div>
                            <div className="text-xs text-slate-400">
                              {change.direction} · {change.timeframe}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p>
                            {change.previous.quality.grade} ({change.previous.quality.score}) →{" "}
                            {change.current.quality.grade} ({change.current.quality.score}){" "}
                            <span className={change.qualityDelta >= 0 ? "text-emerald-300" : "text-rose-300"}>
                              ({formatDelta(change.qualityDelta, messages.naLabel)})
                            </span>
                          </p>
                        </td>
                        <td className="px-4 py-3">{renderRingDeltas(change)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredChanged.length > 10 && (
                  <p className="px-4 py-2 text-xs text-slate-500">
                    {messages.more.replace("{count}", (filteredChanged.length - 10).toString())}
                  </p>
                )}
              </div>
            )}
          </div>

          {(filteredTopGainers.length > 0 || filteredTopLosers.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {[{ label: messages.topGainers, entries: filteredTopGainers }, { label: messages.topLosers, entries: filteredTopLosers }].map(
                (section) => (
                  <div key={section.label} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{section.label}</p>
                    {section.entries.length === 0 ? (
                      <p className="text-sm text-slate-500">{messages.none}</p>
                    ) : (
                      <ul className="space-y-2 text-sm text-slate-200">
                        {section.entries.map((entry) => (
                          <li key={entry.matchKey} className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-2">
                            <div className="flex items-center justify-between">
                              {renderSetupInfo(entry.current, true)}
                              <span className={entry.qualityDelta >= 0 ? "text-emerald-300" : "text-rose-300"}>
                                {formatDelta(entry.qualityDelta, messages.naLabel)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
