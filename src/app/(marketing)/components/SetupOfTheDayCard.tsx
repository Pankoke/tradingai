import React from "react";
import type { JSX } from "react";
import type { SetupCardSetup } from "./SetupCard";

type SetupOfTheDayCardProps = {
  setup: SetupCardSetup;
};

export function SetupOfTheDayCard({ setup }: SetupOfTheDayCardProps): JSX.Element {
  const isLong = setup.direction === "Long";

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md sm:p-6 lg:flex-row lg:items-stretch lg:p-7">
      {/* Linke Seite: Titel, Symbol, Richtung, kleine Gauges */}
      <div className="flex flex-1 flex-col gap-5">
        <div className="space-y-2">
          <p className="text-[0.6rem] uppercase tracking-[0.35em] text-[var(--text-secondary)]">
            Setup des Tages
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {setup.symbol.toUpperCase()} · {setup.timeframe}
          </h2>
          <p className={`text-lg font-semibold ${isLong ? "text-emerald-400" : "text-red-400"}`}>
            {setup.direction}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SmallGauge label="Event" value={setup.eventScore} />
          <SmallGauge label="Bias" value={setup.biasScore} />
          <SmallGauge label="Sentiment" value={setup.sentimentScore} />
          <SmallGauge label="Ausgewogen" value={setup.balanceScore} />
        </div>
      </div>

      {/* Rechte Seite: großer Confidence-Gauge */}
      <div className="flex flex-col items-center gap-3 lg:w-64 lg:items-end">
        <BigGauge value={setup.confidence} />
      </div>

      {/* Unterer Bereich: Entry / SL / TP */}
      <div className="mt-2 grid w-full gap-3 border-t border-[var(--border-subtle)] pt-4 text-xs sm:grid-cols-3">
        <LevelBox label="Entry-Zone" value={setup.entryZone} />
        <LevelBox label="Stop-Loss" value={setup.stopLoss} />
        <LevelBox label="Take-Profit" value={setup.takeProfit} />
      </div>
    </section>
  );
}

type GaugeProps = {
  label?: string;
  value: number;
};

function SmallGauge({ label, value }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full sm:h-20 sm:w-20"
        style={{
          background: `conic-gradient(var(--accent) ${clamped}%, rgba(15,23,42,0.85) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[70%] w-[70%] items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <span className="text-xs font-semibold text-[var(--text-primary)]">{clamped}%</span>
        </div>
      </div>
      {label ? (
        <span className="text-[0.7rem] text-[var(--text-secondary)]">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function BigGauge({ value }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center gap-2 lg:items-end">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32"
        style={{
          background: `conic-gradient(var(--accent) ${clamped}%, rgba(15,23,42,0.85) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[70%] w-[70%] flex-col items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <span className="text-lg font-semibold text-[var(--text-primary)]">{clamped}%</span>
          <span className="text-[0.65rem] uppercase tracking-wide text-[var(--text-secondary)]">
            Confidence
          </span>
        </div>
      </div>
    </div>
  );
}

type LevelBoxProps = {
  label: string;
  value: string;
};

function LevelBox({ label, value }: LevelBoxProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-3">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
