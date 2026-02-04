"use client";

import { useMemo, useState } from "react";
import type { CompletedTrade } from "@/src/domain/backtest/types";

function formatNumber(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toLocaleString("en-US", { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits });
}

export default function TradesTable({ trades, title }: { trades: CompletedTrade[]; title: string }) {
  const [limit, setLimit] = useState(200);
  const visible = useMemo(() => trades.slice(0, limit), [trades, limit]);
  const hasMore = trades.length > visible.length;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hasMore && (
          <button
            type="button"
            className="text-xs underline text-[var(--text-secondary)]"
            onClick={() => setLimit((prev) => Math.min(trades.length, prev + 200))}
          >
            Show more ({trades.length - visible.length} remaining)
          </button>
        )}
      </div>
      {trades.length === 0 && <div className="text-sm text-[var(--text-secondary)]">No trades</div>}
      {trades.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[var(--text-secondary)]">
              <tr>
                <th className="px-2 py-1">Side</th>
                <th className="px-2 py-1">Entry</th>
                <th className="px-2 py-1">Exit</th>
                <th className="px-2 py-1">Bars</th>
                <th className="px-2 py-1">Reason</th>
                <th className="px-2 py-1">Net PnL</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t, idx) => (
                <tr key={`${t.entry.iso}-${idx}`} className="border-t border-white/5">
                  <td className="px-2 py-1">{t.side}</td>
                  <td className="px-2 py-1">
                    <div>{t.entry.iso}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{formatNumber(t.entry.price, 4)}</div>
                  </td>
                  <td className="px-2 py-1">
                    <div>{t.exit.iso}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{formatNumber(t.exit.price, 4)}</div>
                  </td>
                  <td className="px-2 py-1">{t.barsHeld}</td>
                  <td className="px-2 py-1">{t.reason}</td>
                  <td className="px-2 py-1">{formatNumber(t.pnl?.netPnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && <div className="mt-2 text-xs text-[var(--text-secondary)]">Showing {visible.length} of {trades.length}</div>}
        </div>
      )}
    </div>
  );
}
