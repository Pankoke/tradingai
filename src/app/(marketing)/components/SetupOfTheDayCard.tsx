import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import type { SetupCardSetup } from "./SetupCard";

type SetupOfTheDayCardProps = {
  setup: SetupCardSetup;
};

type GaugeProps = {
  label?: string;
  value: number;
};

type LevelBoxPropsDay = {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "success";
};

function toneClass(tone: LevelBoxPropsDay["tone"]): string {
  if (tone === "danger") return "text-red-400";
  if (tone === "success") return "text-emerald-400";
  return "text-[var(--text-primary)]";
}

export function SetupOfTheDayCard({ setup }: SetupOfTheDayCardProps): JSX.Element {
  const isLong = setup.direction === "Long";

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-lg shadow-[rgba(0,0,0,0.35)] ring-1 ring-[rgba(34,197,94,0.08)] sm:p-6 lg:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.35em] text-[var(--text-secondary)]">
              Setup des Tages
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {setup.symbol.toUpperCase()} · {setup.timeframe}
            </h2>
            <p className={`text-2xl font-semibold ${isLong ? "text-emerald-400" : "text-red-400"}`}>
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

        <div className="mt-4 flex flex-col items-center lg:mt-0 lg:w-64 lg:items-end">
          <BigGauge value={setup.confidence} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-[var(--border-subtle)] pt-4 text-xs sm:grid-cols-3">
        <LevelBox label="Entry-Zone" value={setup.entryZone} tone="neutral" />
        <LevelBox label="Stop-Loss" value={setup.stopLoss} tone="danger" />
        <LevelBox label="Take-Profit" value={setup.takeProfit} tone="success" />
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href={`/setups/${setup.id}`}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-black shadow-[0_10px_20px_rgba(34,197,94,0.25)] transition hover:opacity-90"
        >
          Analyse öffnen
        </Link>
      </div>
    </section>
  );
}

function SmallGauge({ label, value }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20"
        style={{
          background: `conic-gradient(var(--accent) ${clamped}%, rgba(7,12,24,0.9) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[70%] w-[70%] items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <span className="text-xs font-semibold text-white">{clamped}%</span>
        </div>
      </div>
      {label ? <span className="text-[0.7rem] text-[var(--text-secondary)]">{label}</span> : null}
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
          background: `conic-gradient(var(--accent) ${clamped}%, rgba(7,12,24,0.9) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[70%] w-[70%] flex-col items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <span className="text-2xl font-semibold text-white">{clamped}%</span>
          <span className="text-[0.65rem] uppercase tracking-wide text-[var(--text-secondary)]">
            Confidence
          </span>
        </div>
      </div>
    </div>
  );
}

function LevelBox({ label, value, tone = "neutral" }: LevelBoxPropsDay): JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-3 shadow-inner shadow-[rgba(0,0,0,0.25)]">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${toneClass(tone)}`}>{value}</div>
    </div>
  );
}
