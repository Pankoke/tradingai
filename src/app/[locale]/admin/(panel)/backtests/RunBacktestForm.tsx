"use client";

import { useState } from "react";

type Defaults = {
  assetId?: string;
  fromDate?: string;
  toDate?: string;
  stepHours?: number;
  feeBps?: number;
  slippageBps?: number;
  holdSteps?: number;
};

type Props = {
  locale: string;
  defaultValues?: Defaults;
};

export function RunBacktestForm({ locale, defaultValues }: Props) {
  const [assetId, setAssetId] = useState(defaultValues?.assetId ?? "btc");
  const [fromDate, setFromDate] = useState(defaultValues?.fromDate ?? "");
  const [toDate, setToDate] = useState(defaultValues?.toDate ?? "");
  const [stepHours, setStepHours] = useState(defaultValues?.stepHours ?? 4);
  const [feeBps, setFeeBps] = useState(defaultValues?.feeBps ?? 0);
  const [slippageBps, setSlippageBps] = useState(defaultValues?.slippageBps ?? 0);
  const [holdSteps, setHoldSteps] = useState(defaultValues?.holdSteps ?? 3);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayIsoDate = new Date().toISOString().slice(0, 10);

  function setPreset(days: number) {
    const to = todayIsoDate;
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - days + 1);
    const fromIso = from.toISOString().slice(0, 10);
    setFromDate(fromIso);
    setToDate(to);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!fromDate || !toDate) {
      setStatus("Bitte von/bis Datum wählen.");
      return;
    }
    if (fromDate > toDate) {
      setStatus("From-Datum darf nicht nach To-Datum liegen.");
      return;
    }
    const fromIso = `${fromDate}T00:00:00.000Z`;
    const toIso = `${toDate}T23:59:59.999Z`;
    setStatus("running...");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, fromIso, toIso, stepHours, feeBps, slippageBps, holdSteps }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setStatus("done - refreshing...");
        window.location.href = `/${locale}/admin/backtests`;
      } else {
        setStatus(json.error ?? "failed");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-4">
      <div className="text-sm font-semibold text-slate-100">Run Backtest</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Asset
          <input
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            placeholder="btc"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          From (UTC)
          <input
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          To (UTC)
          <input
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Step Hours
          <input
            type="number"
            min={1}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            value={stepHours}
            onChange={(e) => setStepHours(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Fee (bps)
          <input
            type="number"
            min={0}
            max={1000}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            value={feeBps}
            onChange={(e) => setFeeBps(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Slippage (bps)
          <input
            type="number"
            min={0}
            max={1000}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            value={slippageBps}
            onChange={(e) => setSlippageBps(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Hold Steps
          <input
            type="number"
            min={1}
            max={200}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            value={holdSteps}
            onChange={(e) => setHoldSteps(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span>Presets:</span>
        <button
          type="button"
          className="rounded border border-slate-700 px-2 py-1 hover:border-slate-500"
          onClick={() => setPreset(7)}
        >
          Last 7 days
        </button>
        <button
          type="button"
          className="rounded border border-slate-700 px-2 py-1 hover:border-slate-500"
          onClick={() => setPreset(30)}
        >
          Last 30 days
        </button>
        <span className="text-[var(--text-secondary)]">Dates are interpreted in UTC. From = start of day, To = end of day.</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          disabled={!assetId || !fromDate || !toDate || fromDate > toDate || isSubmitting}
        >
          Start
        </button>
        {status && <span className="text-xs text-slate-300">{status}</span>}
      </div>
    </form>
  );
}
