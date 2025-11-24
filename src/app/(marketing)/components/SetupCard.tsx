import React from "react";
import type { JSX } from "react";

export type Direction = "Long" | "Short";

export type SetupCardSetup = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: Direction;
  confidence: number;
  eventScore: number;
  biasScore: number;
  sentimentScore: number;
  balanceScore: number;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  type: "Regelbasiert" | "KI";
};

type SetupCardProps = {
  setup: SetupCardSetup;
  highlight?: boolean;
};

export function SetupCard({ setup, highlight = false }: SetupCardProps): JSX.Element {
  const directionColor =
    setup.direction === "Long" ? "text-emerald-400" : "text-red-400";

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 ${highlight ? "shadow-md" : ""}`}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>{setup.symbol}</span>
            <span className="text-xs text-[var(--text-secondary)]">· {setup.timeframe}</span>
          </div>
          <div className={`text-xs font-medium ${directionColor}`}>{setup.direction}</div>
        </div>
        <div className="flex flex-col items-end text-xs">
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--text-primary)]">
            {setup.type}
          </span>
          <span className="mt-1 text-[var(--text-secondary)]">
            Confidence:{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {setup.confidence}%
            </span>
          </span>
        </div>
      </header>
      <div className="grid gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
        <ScoreRow label="Event" value={setup.eventScore} />
        <ScoreRow label="Bias" value={setup.biasScore} />
        <ScoreRow label="Sentiment" value={setup.sentimentScore} />
        <ScoreRow label="Balance" value={setup.balanceScore} />
      </div>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
        <LevelBox label="Entry-Zone" value={setup.entryZone} />
        <LevelBox label="Stop-Loss" value={setup.stopLoss} />
        <LevelBox label="Take-Profit" value={setup.takeProfit} />
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-main)]">
        <div
          className="h-full bg-[var(--accent)] transition-all"
          style={{ width: `${setup.confidence}%` }}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-black hover:opacity-90"
        >
          Analyse öffnen
        </button>
      </div>
    </article>
  );
}

type ScoreRowProps = {
  label: string;
  value: number;
};

function ScoreRow({ label, value }: ScoreRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-medium text-[var(--text-primary)]">{value}%</span>
    </div>
  );
}

type LevelBoxProps = {
  label: string;
  value: string;
};

function LevelBox({ label, value }: LevelBoxProps): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2">
      <div className="text-[0.65rem] uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="text-xs font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
