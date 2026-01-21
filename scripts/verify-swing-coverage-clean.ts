import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type AuditRow = {
  assetId: string;
  timeframe: string;
  label: string;
  snapshots: number;
  setups: number;
  latestSnapshot: string;
  playbook: string;
  reason: string;
};

type Violation = AuditRow;

const swingTimeframes = new Set(["1d", "1w"]);
const swingLabels = new Set(["eod", "us_open", "morning", "(null)"]);
const fxAssets = new Set(["eurusd", "gbpusd", "usdjpy", "eurjpy"]);
const OUTPUT_VERSION = "v2";

function loadText(path: string): string {
  const buf = readFileSync(path);
  // Detect UTF-16LE by BOM or presence of many null bytes.
  const hasUtf16Bom = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
  const hasNulls = buf.some((b, idx) => idx % 2 === 1 && b === 0);
  if (hasUtf16Bom || hasNulls) {
    return buf.toString("utf16le");
  }
  return buf.toString("utf8");
}

function parseAuditFile(path: string): AuditRow[] {
  const text = loadText(path);
  const lines = text.split(/\r?\n/);
  const rows: AuditRow[] = [];
  const rowRegex =
    /^\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|$/;

  for (const line of lines) {
    const match = rowRegex.exec(line);
    if (!match) continue;
    const [, assetId, timeframe, label, snapshots, setups, latest, playbook, reason] = match.map((m) => m.trim());
    rows.push({
      assetId: assetId.toLowerCase(),
      timeframe: timeframe.toLowerCase(),
      label: label.toLowerCase(),
      snapshots: Number.parseInt(snapshots, 10),
      setups: Number.parseInt(setups, 10),
      latestSnapshot: latest,
      playbook,
      reason,
    });
  }
  return rows;
}

function isSwing(row: AuditRow): boolean {
  return swingTimeframes.has(row.timeframe) && swingLabels.has(row.label);
}

function buildViolations(rows: AuditRow[]): Violation[] {
  return rows.filter(
    (row) =>
      isSwing(row) &&
      (row.playbook === "generic-swing-v0.1" || row.reason.toLowerCase() === "fallback generic"),
  );
}

function sumAlignment(obj: unknown): number {
  if (!obj || typeof obj !== "object") return 0;
  const rec = obj as Record<string, unknown>;
  const values = ["LONG", "SHORT", "NEUTRAL"].map((k) => Number(rec[k] ?? 0));
  return values.reduce((acc, v) => (Number.isFinite(v) ? acc + v : acc), 0);
}

function collectFxAlignmentFlag(): boolean {
  try {
    const dir = "artifacts/phase0-baseline";
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a)); // newest first by timestamp name
    if (!files.length) return false;
    const latest = files[0];
    const data = JSON.parse(readFileSync(join(dir, latest), "utf-8"));
    // Baseline structure: assets.<assetId>.alignmentDistribution
    const assets = data?.assets ?? data?.data?.summaries ?? {};
    let allFxHaveAlignment = true;
    for (const fx of fxAssets) {
      const alignment = assets[fx]?.alignmentDistribution;
      if (!alignment || sumAlignment(alignment) <= 0) {
        allFxHaveAlignment = false;
        break;
      }
    }
    return allFxHaveAlignment;
  } catch {
    return false;
  }
}

function writeJson(path: string, payload: unknown): void {
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function writeMarkdown(path: string, violations: Violation[], stats: Record<string, number | boolean>): void {
  const lines: string[] = [];
  lines.push("# Swing Coverage Verification");
  lines.push("");
  lines.push("## Summary");
  for (const [key, value] of Object.entries(stats)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  if (violations.length === 0) {
    lines.push("No violations found for swing timeframes.");
  } else {
    lines.push("### Violations");
    lines.push("| asset | timeframe | label | playbook | reason | setups | latestSnapshot |");
    lines.push("| --- | --- | --- | --- | --- | ---: | --- |");
    for (const v of violations) {
      lines.push(
        `| ${v.assetId} | ${v.timeframe} | ${v.label} | ${v.playbook} | ${v.reason} | ${v.setups} | ${v.latestSnapshot} |`,
      );
    }
  }
  writeFileSync(path, lines.join("\n"), "utf-8");
}

function main(): void {
  const auditPaths = [
    "artifacts/coverage/audit-playbooks-l30-v1.txt",
    "artifacts/coverage/audit-playbooks-l60-v1.txt",
  ];

  const allRows = auditPaths.flatMap((p) => parseAuditFile(p));
  const violations = buildViolations(allRows);

  const wtiOk = allRows
    .filter((r) => isSwing(r) && r.assetId === "wti")
    .every((r) => r.playbook === "energy-swing-v0.1");
  const silverOk = allRows
    .filter((r) => isSwing(r) && r.assetId === "silver")
    .every((r) => r.playbook === "metals-swing-v0.1");

  const stats = {
    totalRows: allRows.length,
    swingRows: allRows.filter(isSwing).length,
    violationsGeneric: violations.length,
    wtiOk,
    silverOk,
    fxAlignmentPresentInReport: collectFxAlignmentFlag(),
  };

  writeJson(`artifacts/coverage/verify-swing-coverage-clean-${OUTPUT_VERSION}.json`, { stats, violations });
  writeMarkdown(`artifacts/coverage/verify-swing-coverage-clean-${OUTPUT_VERSION}.md`, violations, stats);
}

main();
