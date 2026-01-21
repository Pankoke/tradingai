#!/usr/bin/env ts-node
import fs from "fs";
import path from "path";

type AuditRow = {
  asset: string;
  timeframe: string;
  label: string;
  snapshots: number;
  setups: number;
  latestSnapshot: string;
  playbook: string;
  reason: string;
};

type ActiveAssetEntry = {
  assetId: string;
  count: number;
  latestSnapshot: string | null;
  hasSwingData: boolean;
  swingClean: boolean;
  swingPlaybooks: string[];
  violations: AuditRow[];
};

const AUDIT_DIR = path.join(process.cwd(), "artifacts", "coverage");
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  "active-assets-swing-coverage-v1.json",
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  "active-assets-swing-coverage-v1.md",
);
const OUTPUT_SUMMARY = path.join(
  AUDIT_DIR,
  "active-assets-swing-coverage-summary-v1.md",
);

const allowedSwingLabels = new Set(["eod", "us_open", "morning", "(null)"]);
const swingTimeframes = new Set(["1d", "1w"]);
const GENERIC_PLAYBOOK = "generic-swing-v0.1";
const GENERIC_REASON = "fallback generic";

function readAuditFile(days: number): string {
  const fileName =
    days === 60 ? "audit-playbooks-l60-v1.txt" : "audit-playbooks-l30-v1.txt";
  const fullPath = path.join(AUDIT_DIR, fileName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Audit file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, "utf16le");
}

function parseAudit(content: string): AuditRow[] {
  const rows: AuditRow[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (line.includes("---")) continue; // header separator
    const cols = line.split("|").map((c) => c.trim());
    // Expected 9 entries including empty first/last because of pipe; safeguard length >=8
    if (cols.length < 9) continue;
    const asset = cols[1]?.toLowerCase() ?? "";
    if (asset === "asset") continue; // header row
    const timeframe = cols[2]?.toLowerCase() ?? "";
    const label = cols[3]?.toLowerCase() ?? "";
    const snapshots = Number.parseInt(cols[4] ?? "0", 10);
    const setups = Number.parseInt(cols[5] ?? "0", 10);
    const latestSnapshot = cols[6] ?? "";
    const playbook = cols[7] ?? "";
    const reason = cols[8] ?? "";
    if (!asset) continue;
    rows.push({
      asset,
      timeframe,
      label,
      snapshots,
      setups,
      latestSnapshot,
      playbook,
      reason,
    });
  }
  return rows;
}

function isSwingRow(row: AuditRow): boolean {
  return swingTimeframes.has(row.timeframe) && allowedSwingLabels.has(row.label);
}

function isCleanSwingRow(row: AuditRow): boolean {
  return row.playbook !== GENERIC_PLAYBOOK && row.reason !== GENERIC_REASON;
}

function buildActiveAssetEntries(rows: AuditRow[]): ActiveAssetEntry[] {
  const map = new Map<string, ActiveAssetEntry>();
  for (const row of rows) {
    const current = map.get(row.asset);
    const latestSnapshot =
      !row.latestSnapshot || row.latestSnapshot === ""
        ? null
        : row.latestSnapshot;
    if (!current) {
      map.set(row.asset, {
        assetId: row.asset,
        count: row.setups,
        latestSnapshot,
        hasSwingData: isSwingRow(row),
        swingClean: isSwingRow(row) ? isCleanSwingRow(row) : true,
        swingPlaybooks: isSwingRow(row) ? [row.playbook] : [],
        violations: isSwingRow(row) && !isCleanSwingRow(row) ? [row] : [],
      });
    } else {
      current.count += row.setups;
      if (latestSnapshot) {
        current.latestSnapshot =
          !current.latestSnapshot ||
          new Date(latestSnapshot).getTime() >
            new Date(current.latestSnapshot).getTime()
            ? latestSnapshot
            : current.latestSnapshot;
      }
      if (isSwingRow(row)) {
        current.hasSwingData = true;
        if (!current.swingPlaybooks.includes(row.playbook)) {
          current.swingPlaybooks.push(row.playbook);
        }
        if (!isCleanSwingRow(row)) {
          current.swingClean = false;
          current.violations.push(row);
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.assetId.localeCompare(b.assetId),
  );
}

function renderMarkdown(
  entries: ActiveAssetEntry[],
  source: string,
  days: number,
): string {
  const ok = entries.filter(
    (e) => e.hasSwingData && e.swingClean && e.violations.length === 0,
  );
  const missing = entries.filter(
    (e) => e.hasSwingData && (e.swingClean === false || e.violations.length > 0),
  );
  const noSwing = entries.filter((e) => !e.hasSwingData);
  const lines: string[] = [];
  lines.push(`# Active Assets Swing Coverage (v1)`);
  lines.push(`Source: ${source}, days=${days}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(
    `- Active assets: ${entries.length}\n- Swing OK: ${ok.length}\n- Swing violations: ${missing.length}\n- Active but no swing data: ${noSwing.length}`,
  );
  lines.push("");
  lines.push(`## Swing OK`);
  lines.push(`| Asset | Swing Playbooks | Latest Snapshot |`);
  lines.push(`| --- | --- | --- |`);
  for (const e of ok) {
    lines.push(
      `| ${e.assetId} | ${e.swingPlaybooks.join(", ")} | ${
        e.latestSnapshot ?? "-"
      } |`,
    );
  }
  lines.push("");
  lines.push(`## Swing Violations`);
  if (missing.length === 0) {
    lines.push(`(none)`);
  } else {
    lines.push(
      `| Asset | Timeframe | Label | Playbook | Reason | Latest Snapshot |`,
    );
    lines.push(`| --- | --- | --- | --- | --- | --- |`);
    for (const e of missing) {
      for (const v of e.violations) {
        lines.push(
          `| ${e.assetId} | ${v.timeframe} | ${v.label} | ${v.playbook} | ${v.reason} | ${v.latestSnapshot} |`,
        );
      }
    }
  }
  lines.push("");
  lines.push(`## Active but no swing data`);
  if (noSwing.length === 0) {
    lines.push(`(none)`);
  } else {
    lines.push(`| Asset | Latest Snapshot | Count |`);
    lines.push(`| --- | --- | ---: |`);
    for (const e of noSwing) {
      lines.push(
        `| ${e.assetId} | ${e.latestSnapshot ?? "-"} | ${e.count} |`,
      );
    }
  }
  return lines.join("\n");
}

function main() {
  const daysArg = process.argv[2];
  const days = daysArg ? Number.parseInt(daysArg, 10) : 30;
  const source = "audit";
  const auditContent = readAuditFile(days);
  const rows = parseAudit(auditContent);
  const entries = buildActiveAssetEntries(rows);

  const missingSwingCoverage = entries
    .filter((e) => e.hasSwingData && !e.swingClean)
    .map((e) => e.assetId);
  const activeButNoSwingData = entries
    .filter((e) => !e.hasSwingData)
    .map((e) => e.assetId);

  const payload = {
    source,
    days,
    activeAssets: entries,
    missingSwingCoverage,
    activeButNoSwingData,
  };

  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(payload, null, 2));
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(entries, source, days));

  const summaryLines = [
    "# Active Assets Swing Coverage Summary (v1)",
    `Source: ${source}, days=${days}`,
    "",
    `- missingSwingCoverage: ${missingSwingCoverage.length === 0 ? "none" : missingSwingCoverage.join(", ")}`,
    `- activeButNoSwingData: ${activeButNoSwingData.length === 0 ? "none" : activeButNoSwingData.join(", ")}`,
    "",
    `Outputs:`,
    `- ${path.relative(process.cwd(), OUTPUT_JSON)}`,
    `- ${path.relative(process.cwd(), OUTPUT_MD)}`,
  ];
  fs.writeFileSync(OUTPUT_SUMMARY, summaryLines.join("\n"));
}

main();
