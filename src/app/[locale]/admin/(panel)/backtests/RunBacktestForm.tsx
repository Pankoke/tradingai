"use client";

import { useState } from "react";

type Props = {
  locale: string;
};

export function RunBacktestForm({ locale }: Props) {
  const [assetId, setAssetId] = useState("btc");
  const [fromIso, setFromIso] = useState("");
  const [toIso, setToIso] = useState("");
  const [stepHours, setStepHours] = useState(4);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("running...");
    try {
      const res = await fetch("/api/admin/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, fromIso, toIso, stepHours }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setStatus("done – refreshing...");
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
