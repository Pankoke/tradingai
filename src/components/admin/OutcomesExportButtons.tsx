"use client";

import { useCallback, useState } from "react";

type Props = {
  days: number;
  assetId?: string;
  playbookId?: string;
  showNoTradeType?: boolean;
  locale: string;
};

function buildUrl(base: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    search.set(key, String(value));
  });
  return `${base}?${search.toString()}`;
}

export function OutcomesExportButtons({ days, assetId, playbookId, showNoTradeType, locale }: Props) {
  const [loading, setLoading] = useState<"csv" | "json" | null>(null);

  const handleExport = useCallback(
    async (format: "csv" | "json") => {
      try {
        setLoading(format);
        const url = buildUrl("/api/admin/outcomes/export", {
          days,
          assetId,
          playbookId,
          showNoTradeType: showNoTradeType ? "1" : undefined,
          format,
        });
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          const errText = await res.text();
          console.error("[outcomes-export] failed", res.status, errText);
          alert(`Export fehlgeschlagen (${res.status}). Prüfe deine Admin-Session. Details in der Konsole.`);
          return;
        }
        if (format === "json") {
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `outcomes_${days}d.json`;
          link.click();
          URL.revokeObjectURL(link.href);
          return;
        }
        const text = await res.text();
        const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `outcomes_${days}d.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      } finally {
        setLoading(null);
      }
    },
    [assetId, days, playbookId, showNoTradeType],
  );

  return (
    <div className="flex gap-3 text-xs">
      <button
        type="button"
        onClick={() => handleExport("csv")}
        disabled={loading === "csv"}
        className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
      >
        {loading === "csv" ? "Export…" : "Export CSV"}
      </button>
      <button
        type="button"
        onClick={() => handleExport("json")}
        disabled={loading === "json"}
        className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
      >
        {loading === "json" ? "Export…" : "Export JSON"}
      </button>
    </div>
  );
}
