import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";

type OutcomeKey = {
  assetId: string;
  timeframe: string;
  label: string;
  playbookId: string;
  decision: string;
  grade: string;
};

type OutcomeRow = {
  key: OutcomeKey;
  outcomesTotal: number;
  closedCount?: number;
  openCount?: number;
  tpCount?: number;
  slCount?: number;
  expiredCount?: number;
  ambiguousCount?: number;
  invalidCount?: number;
  unknownCount?: number;
  closeRate?: number;
  winrateTpSl?: number;
};

type OutcomeReport = {
  version: string;
  generatedAt: string;
  params: { days: number; timeframes: string[]; labels: string[]; assets?: string[] };
  byKey: OutcomeRow[];
  notes: string[];
};

type ReadinessRow = OutcomeRow & {
  warnings: string[];
};

function loadWarnings(row: OutcomeRow): string[] {
  const warnings: string[] = [];
  if (row.outcomesTotal < 30) warnings.push("tooFewOutcomes");
  const closed = row.closedCount ?? 0;
  if (closed < 20) warnings.push("tooFewClosed");
  const closeRate = row.closeRate ?? 0;
  if (closeRate < 0.2) warnings.push("mostlyOpen");
  return warnings;
}

async function loadLatestReport(): Promise<OutcomeReport | null> {
  const filePath = path.join(process.cwd(), "artifacts", "phase1", "swing-outcome-analysis-latest-v1.json");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as OutcomeReport;
  } catch (err) {
    console.error("[readiness] unable to read outcome analysis artifact", { filePath, err });
    return null;
  }
}

function formatPct(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return "n/a";
  return `${(v * 100).toFixed(1)}%`;
}

function formatNumber(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return "0";
  return v.toString();
}

export default async function ReadinessPage() {
  const report = await loadLatestReport();
  if (!report) {
    notFound();
  }

  const rows: ReadinessRow[] = (report?.byKey ?? []).map((r) => ({
    ...r,
    warnings: loadWarnings(r),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Phase-1.2 Swing Outcome Readiness</h1>
      <p className="text-sm text-muted-foreground">
        Artefakt: swing-outcome-analysis-latest-v1.json · Generated: {report?.generatedAt ?? "n/a"} · days=
        {report?.params.days ?? "?"} · TF={report?.params.timeframes.join(",") ?? "?"} · labels=
        {report?.params.labels.join(",") ?? "?"}
      </p>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Asset</th>
              <th className="px-3 py-2 text-left">TF</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left">Playbook</th>
              <th className="px-3 py-2 text-left">Decision</th>
              <th className="px-3 py-2 text-left">Outcomes</th>
              <th className="px-3 py-2 text-left">Closed</th>
              <th className="px-3 py-2 text-left">Open</th>
              <th className="px-3 py-2 text-left">TP</th>
              <th className="px-3 py-2 text-left">SL</th>
              <th className="px-3 py-2 text-left">Winrate (tp/(tp+sl))</th>
              <th className="px-3 py-2 text-left">CloseRate</th>
              <th className="px-3 py-2 text-left">Warnings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.key.assetId}|${row.key.timeframe}|${row.key.label}|${row.key.playbookId}|${row.key.decision}`}>
                <td className="px-3 py-2">{row.key.assetId}</td>
                <td className="px-3 py-2">{row.key.timeframe}</td>
                <td className="px-3 py-2">{row.key.label}</td>
                <td className="px-3 py-2">{row.key.playbookId}</td>
                <td className="px-3 py-2">{row.key.decision}</td>
                <td className="px-3 py-2">{formatNumber(row.outcomesTotal)}</td>
                <td className="px-3 py-2">{formatNumber(row.closedCount)}</td>
                <td className="px-3 py-2">{formatNumber(row.openCount ?? row.unknownCount)}</td>
                <td className="px-3 py-2">{formatNumber(row.tpCount)}</td>
                <td className="px-3 py-2">{formatNumber(row.slCount)}</td>
                <td className="px-3 py-2">{formatPct(row.winrateTpSl)}</td>
                <td className="px-3 py-2">{formatPct(row.closeRate)}</td>
                <td className="px-3 py-2">
                  {row.warnings.length === 0 ? (
                    <span className="text-green-600">OK</span>
                  ) : (
                    row.warnings.join(", ")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report?.notes?.length ? (
        <div className="text-sm text-muted-foreground">
          <h2 className="font-semibold">Notes</h2>
          <ul className="list-disc pl-4">
            {report.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Wenn kein Artefakt vorhanden ist, erst `npm run phase1:analyze:swing -- --days=30` laufen lassen. Labels/TF sind
        aktuell fest auf Swing (1D/1W) und eod/us_open/morning/(null) gesetzt.
      </p>
    </div>
  );
}
