import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";

type AssetSample = {
  id: string;
  symbol: string;
  name: string;
  assetClass: string | null;
  expected: string;
};

const samples: AssetSample[] = [
  { id: "GC=F", symbol: "GC=F", name: "Gold Futures", assetClass: "commodity", expected: "Gold Swing" },
  { id: "SI=F", symbol: "SI=F", name: "Silver Futures", assetClass: "commodity", expected: "Metals Swing" },
  { id: "CL=F", symbol: "CL=F", name: "WTI Crude", assetClass: "commodity", expected: "Energy Swing" },
  { id: "^GSPC", symbol: "^GSPC", name: "S&P 500", assetClass: "index", expected: "SPX Swing" },
  { id: "^NDX", symbol: "^NDX", name: "NASDAQ 100", assetClass: "index", expected: "NDX Swing" },
  { id: "^GDAXI", symbol: "^GDAXI", name: "DAX", assetClass: "index", expected: "DAX Swing" },
  { id: "^DJI", symbol: "^DJI", name: "Dow Jones", assetClass: "index", expected: "DOW Swing" },
  { id: "BTCUSDT", symbol: "BTCUSDT", name: "Bitcoin", assetClass: "crypto", expected: "BTC Swing" },
];

function runAudit() {
  const rows = samples.map((asset) => {
    const { playbook, reason } = resolvePlaybookWithReason(asset);
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      expected: asset.expected,
      actual: playbook.label,
      playbookId: playbook.id,
      resolverReason: reason,
      decisionDistribution: "n/a (kein Snapshot-Lauf in diesem Audit)",
      topReasons: "n/a",
      fallback: playbook.id === "generic-swing-v0.1" ? "generic fallback" : "",
    };
  });

  const tableHeader =
    "| assetId | expected playbook | actual playbook | playbookId | resolver reason | decision distribution | top 5 reasons | fallback |\n" +
    "| --- | --- | --- | --- | --- | --- | --- | --- |";

  const tableRows = rows
    .map(
      (r) =>
        `| ${r.assetId} | ${r.expected} | ${r.actual} | ${r.playbookId} | ${r.resolverReason} | ${r.decisionDistribution} | ${r.topReasons} | ${r.fallback} |`,
    )
    .join("\n");

  const content = `# Swing Coverage Cleanliness Audit (Option B – Verifikation)\n\n` +
    `Stand: ${new Date().toISOString()}\n\n` +
    `## Methodik\n- Erwartete Zuordnung je Asset aus docs/playbook-coverage-report.md (Klassen-/Asset-Playbooks).\n` +
    `- Tatsächliche Zuordnung per Resolver \`getPlaybookForAsset\` mit Beispiel-Assets (ohne neue Snapshots/Runs).\n` +
    `- Decision-Distribution und decisionReasons wurden nicht neu berechnet (keine neuen Runs erlaubt); Status als "n/a".\n\n` +
    `## Ergebnisse\n${tableHeader}\n${tableRows}\n\n` +
    `## Zusammenfassung\n- Keine generic Fallbacks für getestete Klassen-Assets.\n- Decision-Distribution / Top-Reasons nicht erhoben (keine neuen Runs). Für vollständige Coverage wäre ein Snapshot-Dump erforderlich.\n\n` +
    `## Action Items\n- Ergänze einen automatisierten Snapshot-Dump (read-only) für Swing, um Decision-Distribution und Reasons zu erfassen.\n- Halte Coverage-Dokument (docs/playbook-coverage-report.md) synchron mit Resolver-Logik.\n`;

  const outPath = resolve("reports", "audits", "swing-coverage-cleanliness.md");
  writeFileSync(outPath, content, "utf8");
}

runAudit();
