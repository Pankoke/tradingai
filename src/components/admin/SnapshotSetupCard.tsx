"use client";

import type { JSX } from "react";
import type { Setup } from "@/src/lib/engine/types";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";
import { JsonReveal } from "@/src/components/admin/JsonReveal";

export type RingKey =
  | "trendScore"
  | "eventScore"
  | "biasScore"
  | "sentimentScore"
  | "orderflowScore"
  | "confidenceScore";

export type SnapshotSetupMessages = {
  showDetails: string;
  hideDetails: string;
  confidence: string;
  rrr: string;
  entry: string;
  stop: string;
  target: string;
  rankOverall: string;
  rankAsset: string;
  showJson: string;
  hideJson: string;
  qualityLabel: string;
  qualityFallback: string;
  qualityScoreLabel: string;
  notAvailableLabel: string;
};

export type SnapshotSetupRankInfo = {
  overall?: number;
  asset?: number;
};

type Props = {
  setup: Setup;
  ringLabels: Record<RingKey, string>;
  messages: SnapshotSetupMessages;
  rank?: SnapshotSetupRankInfo;
  quality?: SignalQuality | null;
  expanded: boolean;
  onToggle: (next: boolean) => void;
};

const ringKeys: RingKey[] = [
  "trendScore",
  "eventScore",
  "biasScore",
  "sentimentScore",
  "orderflowScore",
  "confidenceScore",
];

export function SnapshotSetupCard({
  setup,
  ringLabels,
  messages,
  rank,
  quality,
  expanded,
  onToggle,
}: Props): JSX.Element {
  const rings = setup.rings;
  const riskReward = setup.riskReward;
  const confidenceValue = setup.confidence ?? setup.rings?.confidenceScore ?? null;

  const formatNumber = (value?: number | null, suffix = ""): string => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return messages.notAvailableLabel;
    }
    return `${Math.round(value)}${suffix}`;
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">
            {setup.symbol ?? messages.notAvailableLabel} - {setup.direction ?? messages.notAvailableLabel}
          </p>
          <p className="text-xs text-slate-400">
            {setup.timeframe ?? messages.notAvailableLabel} - ID {setup.id}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 text-xs sm:flex-row sm:items-center">
          <span className="rounded-full border border-slate-700/70 px-3 py-1 font-semibold text-slate-200">
            {messages.qualityLabel}:{" "}
            {quality ? (
              <span className="text-white">
                {quality.grade}{" "}
                <span className="text-slate-400">
                  ({messages.qualityScoreLabel} {quality.score})
                </span>
              </span>
            ) : (
              <span className="text-slate-400">{messages.qualityFallback}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onToggle(!expanded)}
            className="rounded-md border border-slate-700 px-3 py-1 font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-100"
          >
            {expanded ? messages.hideDetails : messages.showDetails}
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ringKeys.map((key) => (
          <div key={key} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 text-center text-xs">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">{ringLabels[key]}</p>
            <p className="text-lg font-semibold text-white">
              {typeof rings?.[key] === "number" ? Math.round(rings[key] as number) : messages.notAvailableLabel}
            </p>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/40 p-4 text-xs text-slate-300">
          <div className="flex flex-wrap gap-4">
            <span>
              {messages.confidence}: {formatNumber(confidenceValue, "%")}
            </span>
            <span>
              {messages.rrr}: {riskReward?.rrr ?? messages.notAvailableLabel}
            </span>
            <span>
              {messages.entry}: {setup.entryZone ?? messages.notAvailableLabel}
            </span>
            <span>
              {messages.stop}: {setup.stopLoss ?? messages.notAvailableLabel}
            </span>
            <span>
              {messages.target}: {setup.takeProfit ?? messages.notAvailableLabel}
            </span>
            {rank?.overall !== undefined && (
              <span>
                {messages.rankOverall}: {rank.overall}
              </span>
            )}
            {rank?.asset !== undefined && (
              <span>
                {messages.rankAsset}: {rank.asset}
              </span>
            )}
          </div>
          <JsonReveal data={setup} showLabel={messages.showJson} hideLabel={messages.hideJson} />
        </div>
      )}
    </div>
  );
}
