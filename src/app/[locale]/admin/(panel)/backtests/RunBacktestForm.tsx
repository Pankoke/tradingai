"use client";

import { useState } from "react";

type Defaults = {
  assetId?: string;
  fromIso?: string;
  toIso?: string;
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
  const [fromIso, setFromIso] = useState(defaultValues?.fromIso ?? "");
  const [toIso, setToIso] = useState(defaultValues?.toIso ?? "");
  const [stepHours, setStepHours] = useState(defaultValues?.stepHours ?? 4);
  const [feeBps, setFeeBps] = useState(defaultValues?.feeBps ?? 0);
  const [slippageBps, setSlippageBps] = useState(defaultValues?.slippageBps ?? 0);
  const [holdSteps, setHoldSteps] = useState(defaultValues?.holdSteps ?? 3);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("running...");
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
          From ISO
          <input
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            value={fromIso}
            onChange={(e) => setFromIso(e.target.value)}
            placeholder="2026-01-01T00:00:00Z"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          To ISO
          <input
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
            value={toIso}
            onChange={(e) => setToIso(e.target.value)}
            placeholder="2026-01-08T00:00:00Z"
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
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          disabled={!assetId || !fromIso || !toIso}
        >
          Start
        </button>
        {status && <span className="text-xs text-slate-300">{status}</span>}
      </div>
    </form>
  );
}