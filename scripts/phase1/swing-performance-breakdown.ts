#!/usr/bin/env ts-node
import { config } from "dotenv";
import { writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { and, eq, gte } from "drizzle-orm";
import { perceptionSnapshots } from "../../src/server/db/schema/perceptionSnapshots";
import { setupOutcomes } from "../../src/server/db/schema/setupOutcomes";

config();
config({ path: ".env.local", override: false });

type Params = {
  days: number;
  minClosed: number;
  assets?: Set<string>;
  timeframes: Set<string>;
  labels: Set<string>;
};

type Key = {
  assetId: string;
  timeframe: string;
  label: string;
  playbookId: string;
  grade: string;
  decisionBucket: string;
};

type StatusCounts = Record<OutcomeClass, number>;

type Bucket = {
  key: Key;
  outcomesTotal: number;
  closedCount: number;
  openCount: number;
  tpCount: number;
  slCount: number;
  expiredCount: number;
  ambiguousCount: number;
  invalidCount: number;
  unknownCount: number;
  winrateTpSl: number | null;
  closeRate: number | null;
  flags: {
    tooFewClosed: boolean;
    mostlyOpen: boolean;
  };
  statusCounts: StatusCounts;
};

type Report = {
  version: string;
  generatedAt: string;
  params: {
    days: number;
    minClosed: number;
    assets?: string[];
    timeframes: string[];
    labels: string[];
  };
  totals: {
    outcomesTotal: number;
    closedCount: number;
    openCount: number;
    tpCount: number;
    slCount: number;
    expiredCount: number;
    ambiguousCount: number;
    invalidCount: number;
    unknownCount: number;
    winrateTpSl: number | null;
    closeRate: number | null;
    statusCounts: StatusCounts;
  };
  buckets: Bucket[];
  insights: {
    topWinrate: Bucket[];
    bottomWinrate: Bucket[];
    openHeavy: Bucket[];
  };
  notes: string[];
};

const OUTPUT_VERSION = "v1";
const DEFAULT_DAYS = 30;
const DEFAULT_MIN_CLOSED = 20;
const DEFAULT_LABELS = ["eod", "us_open", "morning", "(null)"];
const DEFAULT_TIMEFRAMES = ["1d", "1w"];
const OUT_DIR = path.join(process.cwd(), "artifacts", "phase1");

const TP_STATUSES = new Set(["hit_tp", "tp"]);
const SL_STATUSES = new Set(["hit_sl", "sl", "stopped"]);
const EXPIRED_STATUSES = new Set(["expired"]);
const AMBIG_STATUSES = new Set(["ambiguous"]);
const INVALID_STATUSES = new Set(["invalid"]);
const OPEN_STATUSES = new Set(["open", "pending", "none"]);

type OutcomeClass =
  | "TP"
  | "SL"
  | "EXPIRED"
  | "AMBIGUOUS"
  | "INVALID"
  | "OPEN"
  | "UNKNOWN";

function mapOutcomeStatus(statusRaw: string | null | undefined): OutcomeClass {
  if (!statusRaw) return "UNKNOWN";
  const status = statusRaw.toLowerCase();
  if (TP_STATUSES.has(status)) return "TP";
  if (SL_STATUSES.has(status)) return "SL";
  if (EXPIRED_STATUSES.has(status)) return "EXPIRED";
  if (AMBIG_STATUSES.has(status)) return "AMBIGUOUS";
  if (INVALID_STATUSES.has(status)) return "INVALID";
  if (OPEN_STATUSES.has(status)) return "OPEN";
  return "UNKNOWN";
}

function mapDecisionBucket(setupType: string | null | undefined, noTradeReason: string | null | undefined): string {
  const type = (setupType ?? "").toString().toUpperCase();
  if (type === "TRADE" || type === "TRADE_A" || type === "TRADE_B") return "TRADE";
  if (type === "BLOCKED") return "BLOCKED";
  if (type === "WATCH" || type === "WATCH_PLUS" || type === "WATCH+") return "WATCH";
  if (type === "NO_TRADE") return "NO_TRADE";
  if (noTradeReason) return "NO_TRADE";
  return "UNKNOWN";
}

function parseArgs(): Params {
  const args = process.argv.slice(2);
  let days = DEFAULT_DAYS;
  let minClosed = DEFAULT_MIN_CLOSED;
  const assets: Set<string> = new Set();
  let tfSet: Set<string> | null = null;
  let labels: Set<string> | null = null;

  for (const arg of args) {
    if (arg.startsWith("--days=")) {
      const v = Number.parseInt(arg.replace("--days=", ""), 10);
      if (Number.isFinite(v) && v > 0) days = v;
    } else if (arg.startsWith("--minClosed=")) {
      const v = Number.parseInt(arg.replace("--minClosed=", ""), 10);
      if (Number.isFinite(v) && v > 0) minClosed = v;
    } else if (arg.startsWith("--asset=")) {
      const id = arg.replace("--asset=", "").toLowerCase();
      if (id) assets.add(id);
    } else if (arg.startsWith("--timeframes=")) {
      const parts = arg
        .replace("--timeframes=", "")
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      if (parts.length) tfSet = new Set(parts);
    } else if (arg.startsWith("--labels=")) {
      const parts = arg
        .replace("--labels=", "")
        .split(",")
        .map((p) => p.trim().toLowerCase() || "(null)")
        .filter(Boolean);
      if (parts.length) labels = new Set(parts);
    }
  }

  return {
    days,
    minClosed,
    assets: assets.size ? assets : undefined,
    timeframes: tfSet ?? new Set(DEFAULT_TIMEFRAMES),
    labels: labels ?? new Set(DEFAULT_LABELS),
  };
}

function normLabel(label: string | null): string {
  if (!label) return "(null)";
  return label.toString().toLowerCase() || "(null)";
}

function normTf(tf: string | null | undefined): string {
  return (tf ?? "unknown").toString().toLowerCase();
}

type OutcomeRow = {
  outcomeId: string;
  snapshotId: string;
  setupId: string;
  assetId: string;
  timeframe: string;
  evaluationTimeframe: string | null;
  outcomeStatus: string | null;
  evaluatedAt: Date | null;
  playbookId: string | null;
  label: string | null;
  setupType?: string | null;
  noTradeReason?: string | null;
  setupGrade?: string | null;
};

async function loadOutcomeRows(params: Params, from: Date): Promise<OutcomeRow[]> {
  const { db } = await import("../../src/server/db/db");
  const rows = await db
    .select({
      outcomeId: setupOutcomes.id,
      snapshotId: setupOutcomes.snapshotId,
      setupId: setupOutcomes.setupId,
      assetId: setupOutcomes.assetId,
      timeframe: setupOutcomes.timeframe,
      evaluationTimeframe: setupOutcomes.evaluationTimeframe,
      outcomeStatus: setupOutcomes.outcomeStatus,
      evaluatedAt: setupOutcomes.evaluatedAt,
      playbookId: setupOutcomes.playbookId,
      label: perceptionSnapshots.label,
      setupType: setupOutcomes.setupType,
      noTradeReason: setupOutcomes.noTradeReason,
      setupGrade: setupOutcomes.setupGrade,
    })
    .from(setupOutcomes)
    .innerJoin(
      perceptionSnapshots,
      and(
        eq(perceptionSnapshots.id, setupOutcomes.snapshotId),
        gte(perceptionSnapshots.snapshotTime, from),
      ),
    );
  return rows as OutcomeRow[];
}

function aggregate(params: Params, rows: OutcomeRow[]): Report {
  const buckets = new Map<string, Bucket>();
  const statusTotals: StatusCounts = { TP: 0, SL: 0, EXPIRED: 0, AMBIGUOUS: 0, INVALID: 0, OPEN: 0, UNKNOWN: 0 };
  let outcomesTotal = 0;
  let tpTotal = 0;
  let slTotal = 0;
  let expiredTotal = 0;
  let ambiguousTotal = 0;
  let invalidTotal = 0;
  let closedTotal = 0;
  let openTotal = 0;
  let unknownTotal = 0;

  for (const row of rows) {
    const label = normLabel(row.label ?? null);
    if (!params.labels.has(label)) continue;
    const assetId = (row.assetId ?? "").toLowerCase();
    if (!assetId) continue;
    if (params.assets && !params.assets.has(assetId)) continue;
    const tf = normTf(row.timeframe);
    if (!params.timeframes.has(tf)) continue;

    const decisionBucket = mapDecisionBucket(row.setupType, row.noTradeReason);
    const playbookId = (row.playbookId ?? "unknown").toLowerCase();
    const grade = (row.setupGrade ?? "unknown").toLowerCase();

    const statusClass = mapOutcomeStatus(row.outcomeStatus);
    const key: Key = { assetId, timeframe: tf, label, playbookId, grade, decisionBucket };
    const keyStr = `${assetId}|${tf}|${label}|${playbookId}|${grade}|${decisionBucket}`;
    const bucket =
      buckets.get(keyStr) ??
      {
        key,
        outcomesTotal: 0,
        closedCount: 0,
        openCount: 0,
        tpCount: 0,
        slCount: 0,
        expiredCount: 0,
        ambiguousCount: 0,
        invalidCount: 0,
        unknownCount: 0,
        winrateTpSl: null,
        closeRate: null,
        flags: { tooFewClosed: false, mostlyOpen: false },
        statusCounts: { TP: 0, SL: 0, EXPIRED: 0, AMBIGUOUS: 0, INVALID: 0, OPEN: 0, UNKNOWN: 0 },
      };

    bucket.outcomesTotal += 1;
    outcomesTotal += 1;

    bucket.statusCounts[statusClass] = (bucket.statusCounts[statusClass] ?? 0) + 1;
    statusTotals[statusClass] = (statusTotals[statusClass] ?? 0) + 1;

    switch (statusClass) {
      case "TP":
        bucket.tpCount += 1;
        tpTotal += 1;
        bucket.closedCount += 1;
        closedTotal += 1;
        break;
      case "SL":
        bucket.slCount += 1;
        slTotal += 1;
        bucket.closedCount += 1;
        closedTotal += 1;
        break;
      case "EXPIRED":
        bucket.expiredCount += 1;
        expiredTotal += 1;
        bucket.closedCount += 1;
        closedTotal += 1;
        break;
      case "AMBIGUOUS":
        bucket.ambiguousCount += 1;
        ambiguousTotal += 1;
        bucket.closedCount += 1;
        closedTotal += 1;
        break;
      case "INVALID":
        bucket.invalidCount += 1;
        invalidTotal += 1;
        bucket.closedCount += 1;
        closedTotal += 1;
        break;
      case "OPEN":
        bucket.openCount += 1;
        openTotal += 1;
        break;
      case "UNKNOWN":
      default:
        bucket.unknownCount += 1;
        unknownTotal += 1;
        break;
    }

    buckets.set(keyStr, bucket);
  }

  const finalizedBuckets: Bucket[] = [];
  for (const bucket of buckets.values()) {
    const denom = bucket.tpCount + bucket.slCount;
    const winrateTpSl = denom > 0 ? Number((bucket.tpCount / denom).toFixed(4)) : null;
    const closeRate =
      bucket.outcomesTotal > 0 ? Number((bucket.closedCount / bucket.outcomesTotal).toFixed(4)) : null;
    const tooFewClosed = bucket.closedCount < DEFAULT_MIN_CLOSED;
    const mostlyOpen = (closeRate ?? 0) < 0.2;
    finalizedBuckets.push({
      ...bucket,
      winrateTpSl,
      closeRate,
      flags: {
        tooFewClosed,
        mostlyOpen,
      },
    });
  }

  const totalsDenom = tpTotal + slTotal;
  const totalsWinrate = totalsDenom > 0 ? Number((tpTotal / totalsDenom).toFixed(4)) : null;
  const totalsCloseRate = outcomesTotal > 0 ? Number((closedTotal / outcomesTotal).toFixed(4)) : null;

  const eligible = finalizedBuckets.filter((b) => b.closedCount >= params.minClosed);
  const topWinrate = [...eligible].sort((a, b) => (b.winrateTpSl ?? 0) - (a.winrateTpSl ?? 0)).slice(0, 10);
  const bottomWinrate = [...eligible].sort((a, b) => (a.winrateTpSl ?? 0) - (b.winrateTpSl ?? 0)).slice(0, 10);
  const openHeavy = finalizedBuckets
    .filter((b) => b.outcomesTotal >= 10)
    .sort((a, b) => (a.closeRate ?? 0) - (b.closeRate ?? 0))
    .slice(0, 10);

  const report: Report = {
    version: OUTPUT_VERSION,
    generatedAt: new Date().toISOString(),
    params: {
      days: params.days,
      minClosed: params.minClosed,
      assets: params.assets ? Array.from(params.assets) : undefined,
      timeframes: Array.from(params.timeframes),
      labels: Array.from(params.labels),
    },
    totals: {
      outcomesTotal,
      closedCount: closedTotal,
      openCount: openTotal,
      tpCount: tpTotal,
      slCount: slTotal,
      expiredCount: expiredTotal,
      ambiguousCount: ambiguousTotal,
      invalidCount: invalidTotal,
      unknownCount: unknownTotal,
      winrateTpSl: totalsWinrate,
      closeRate: totalsCloseRate,
      statusCounts: statusTotals,
    },
    buckets: finalizedBuckets.sort((a, b) => b.outcomesTotal - a.outcomesTotal),
    insights: {
      topWinrate,
      bottomWinrate,
      openHeavy,
    },
    notes: [
      "Winrate = tp/(tp+sl) if tp+sl>0 else null",
      "Closed = TP+SL+Expired+Ambiguous+Invalid",
      "Open = OPEN+UNKNOWN",
    ],
  };

  return report;
}

function renderMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push("# Swing Performance Breakdown (v1)");
  lines.push(
    `Generated: ${report.generatedAt}, days=${report.params.days}, minClosed=${report.params.minClosed}, tf=${report.params.timeframes.join(
      ",",
    )}, labels=${report.params.labels.join(",")}`,
  );
  lines.push("");
  lines.push("## Totals");
  lines.push(
    `- outcomes: ${report.totals.outcomesTotal}\n- closed: ${report.totals.closedCount} | open: ${report.totals.openCount} | unknown: ${report.totals.unknownCount}\n- tp: ${report.totals.tpCount} | sl: ${report.totals.slCount} | expired: ${report.totals.expiredCount} | ambiguous: ${report.totals.ambiguousCount} | invalid: ${report.totals.invalidCount}\n- winrate tp/(tp+sl): ${report.totals.winrateTpSl ?? "n/a"} | closeRate: ${report.totals.closeRate ?? "n/a"}`,
  );
  lines.push("");
  lines.push("## Top Winrate (minClosed)");
  lines.push("| Asset | TF | Label | Playbook | Decision | Grade | Outcomes | Closed | TP | SL | Winrate tp/(tp+sl) | CloseRate | Flags |");
  lines.push("| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const b of report.insights.topWinrate) {
    lines.push(
      `| ${b.key.assetId} | ${b.key.timeframe} | ${b.key.label} | ${b.key.playbookId} | ${b.key.decisionBucket} | ${b.key.grade} | ${b.outcomesTotal} | ${b.closedCount} | ${b.tpCount} | ${b.slCount} | ${b.winrateTpSl ?? "n/a"} | ${b.closeRate ?? "n/a"} | ${b.flags.tooFewClosed ? "tooFewClosed" : ""}${b.flags.mostlyOpen ? ",mostlyOpen" : ""} |`,
    );
  }
  lines.push("");
  lines.push("## Bottom Winrate (minClosed)");
  lines.push("| Asset | TF | Label | Playbook | Decision | Grade | Outcomes | Closed | TP | SL | Winrate tp/(tp+sl) | CloseRate | Flags |");
  lines.push("| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const b of report.insights.bottomWinrate) {
    lines.push(
      `| ${b.key.assetId} | ${b.key.timeframe} | ${b.key.label} | ${b.key.playbookId} | ${b.key.decisionBucket} | ${b.key.grade} | ${b.outcomesTotal} | ${b.closedCount} | ${b.tpCount} | ${b.slCount} | ${b.winrateTpSl ?? "n/a"} | ${b.closeRate ?? "n/a"} | ${b.flags.tooFewClosed ? "tooFewClosed" : ""}${b.flags.mostlyOpen ? ",mostlyOpen" : ""} |`,
    );
  }
  lines.push("");
  lines.push("## Most Open-Heavy (closeRate ascending, outcomes>=10)");
  lines.push("| Asset | TF | Label | Playbook | Decision | Grade | Outcomes | Closed | Open | Winrate tp/(tp+sl) | CloseRate |");
  lines.push("| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const b of report.insights.openHeavy) {
    lines.push(
      `| ${b.key.assetId} | ${b.key.timeframe} | ${b.key.label} | ${b.key.playbookId} | ${b.key.decisionBucket} | ${b.key.grade} | ${b.outcomesTotal} | ${b.closedCount} | ${b.openCount} | ${b.winrateTpSl ?? "n/a"} | ${b.closeRate ?? "n/a"} |`,
    );
  }
  lines.push("");
  lines.push("Notes:");
  for (const n of report.notes) {
    lines.push(`- ${n}`);
  }
  return lines.join("\n");
}

async function main() {
  const params = parseArgs();
  const from = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);
  const rows = await loadOutcomeRows(params, from);
  const report = aggregate(params, rows);
  const md = renderMarkdown(report);

  mkdirSync(OUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:]/g, "-");
  const jsonPath = path.join(OUT_DIR, `swing-performance-breakdown-${ts}-v1.json`);
  const mdPath = path.join(OUT_DIR, `swing-performance-breakdown-${ts}-v1.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, md);

  const latestJson = path.join(OUT_DIR, "swing-performance-breakdown-latest-v1.json");
  const latestMd = path.join(OUT_DIR, "swing-performance-breakdown-latest-v1.md");
  copyFileSync(jsonPath, latestJson);
  copyFileSync(mdPath, latestMd);

  // eslint-disable-next-line no-console
  console.log(`Wrote: ${jsonPath}`);
  // eslint-disable-next-line no-console
  console.log(`Wrote: ${mdPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
