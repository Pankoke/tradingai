#!/usr/bin/env ts-node
import { config } from "dotenv";
import { writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { and, eq, gte } from "drizzle-orm";
import type { Setup } from "../../src/lib/engine/types";
import { perceptionSnapshots } from "../../src/server/db/schema/perceptionSnapshots";
import { setupOutcomes } from "../../src/server/db/schema/setupOutcomes";

config();
config({ path: ".env.local", override: false });

type Params = {
  days: number;
  assets?: Set<string>;
  timeframes: Set<string>;
  labels: Set<string>;
  allowDerivedPlaybookFallback: boolean;
};

type Key = {
  assetId: string;
  timeframe: string;
  label: string;
  playbookId: string;
  decision: string;
  grade: string;
  alignment?: string | null;
};

type Availability = {
  playbookId: boolean;
  decision: boolean;
  grade: boolean;
  alignment: boolean;
  reasons: boolean;
  segments: boolean;
  outcomeStatus: boolean;
  tpSl: boolean;
};

type KPI = {
  outcomesTotal: number;
  closedCount?: number;
  openCount?: number;
  tpCount?: number;
  slCount?: number;
  expiredCount?: number;
  ambiguousCount?: number;
  invalidCount?: number;
  unknownCount?: number;
  winrateTpSl?: number;
  winrate?: number;
  winrateDefinition: "tp/(tp+sl)" | "unavailable";
  closeRate?: number;
  statusCounts?: Record<string, number>;
};

type ByKey = KPI & {
  key: Key;
  topReasons?: Array<{ reason: string; count: number }>;
  topSegments?: Array<{ segment: string; count: number }>;
};

type Report = {
  version: string;
  generatedAt: string;
  params: {
    days: number;
    assets?: string[];
    timeframes: string[];
    labels: string[];
  };
  availability: Availability;
  overall: KPI;
  byKey: ByKey[];
  notes: string[];
  samples: { matchedSampleIds: string[] };
  dimensionSourceCounts: {
    playbookId: Record<"persisted" | "derived" | "missing", number>;
    decision: Record<"persisted" | "derived" | "missing", number>;
    grade: Record<"persisted" | "derived" | "missing", number>;
  };
  fallbackUsedCount: number;
  allowDerivedPlaybookFallback: boolean;
};

const OUTPUT_VERSION = "v1";
const DEFAULT_DAYS = 30;
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

function fallbackPlaybookId(assetId: string): string | null {
  const id = assetId.toLowerCase();
  if (id === "wti") return "energy-swing-v0.1";
  if (id === "silver") return "metals-swing-v0.1";
  if (id === "spx") return "spx-swing-v0.1";
  if (id === "dax") return "dax-swing-v0.1";
  if (id === "ndx") return "ndx-swing-v0.1";
  if (id === "dow") return "dow-swing-v0.1";
  if (id === "gold") return "gold-swing-v0.2";
  if (id === "btc" || id === "eth") return "crypto-swing-v0.1";
  if (id === "eurusd") return "eurusd-swing-v0.1";
  if (id === "gbpusd") return "gbpusd-swing-v0.1";
  if (id === "usdjpy") return "usdjpy-swing-v0.1";
  if (id === "eurjpy") return "eurjpy-swing-v0.1";
  if (id === "fx" || id.endsWith("usd") || id.endsWith("jpy")) return "fx-swing-v0.1";
  return null;
}

function parseArgs(): Params {
  const args = process.argv.slice(2);
  let days = DEFAULT_DAYS;
  const assets: Set<string> = new Set();
  let tfSet: Set<string> | null = null;
  let labels: Set<string> | null = null;
  let allowDerivedPlaybookFallback = false;

  for (const arg of args) {
    if (arg.startsWith("--days=")) {
      const v = Number.parseInt(arg.replace("--days=", ""), 10);
      if (Number.isFinite(v) && v > 0) days = v;
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
    } else if (arg === "--allowDerivedPlaybookFallback=true") {
      allowDerivedPlaybookFallback = true;
    }
  }

  return {
    days,
    assets: assets.size ? assets : undefined,
    timeframes: tfSet ?? new Set(DEFAULT_TIMEFRAMES),
    labels: labels ?? new Set(DEFAULT_LABELS),
    allowDerivedPlaybookFallback,
  };
}

function normLabel(label: string | null): string {
  if (!label) return "(null)";
  return label.toString().toLowerCase() || "(null)";
}

function normTf(tf: string | null | undefined): string {
  return (tf ?? "unknown").toString().toLowerCase();
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function mapOutcomeStatus(statusRaw: string | null | undefined): OutcomeClass {
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

type Meta = {
  assetId: string | null;
  timeframe: string | null;
  playbookId?: string | null;
  decision?: string | null;
  grade?: string | null;
  alignment?: string | null;
  reasons?: string[];
  segment?: string | null;
};

function extractMetaFromSetup(setup: Setup): Meta {
  const assetId =
    ((setup.assetId ?? setup.symbol ?? (setup as { asset?: { id?: string } }).asset?.id ?? "") as string) ||
    null;
  const timeframe =
    (setup.timeframeUsed ?? setup.timeframe ?? (setup as { timeframeUsed?: string }).timeframeUsed ?? null) as
      | string
      | null;
  const playbookId = (setup as { playbookId?: string | null }).playbookId ?? null;
  const decision =
    (setup as { decision?: string | null }).decision ??
    (setup as { setupDecision?: string | null }).setupDecision ??
    null;
  const grade = (setup as { grade?: string | null }).grade ?? (setup as { setupGrade?: string | null }).setupGrade ?? null;
  const alignment =
    (setup as { alignment?: string | null }).alignment ??
    (setup as { derivedAlignment?: string | null }).derivedAlignment ??
    null;
  const reasons =
    safeArray<string>((setup as { decisionReasons?: string[] | null }).decisionReasons ?? null) ??
    safeArray<string>((setup as { gradeRationale?: string[] | null }).gradeRationale ?? null);
  const segment =
    (setup as { watchSegment?: string | null }).watchSegment ??
    (setup as { fxWatchSegment?: string | null }).fxWatchSegment ??
    null;
  return { assetId, timeframe, playbookId, decision, grade, alignment, reasons, segment };
}

type SetupMap = Map<string, Meta>;

async function loadSnapshotMeta(params: Params, from: Date) {
  const { db } = await import("../../src/server/db/db");
  const rows = await db
    .select()
    .from(perceptionSnapshots)
    .where(and(gte(perceptionSnapshots.snapshotTime, from)));

  const labelMap = new Map<string, string>();
  const setupMetaMap: SetupMap = new Map();

  for (const snap of rows) {
    const label = normLabel(snap.label ?? null);
    labelMap.set(snap.id, label);
    if (!params.labels.has(label)) continue;
    const setups = safeArray<Setup>(snap.setups as Setup[] | null);
    for (const setup of setups) {
      const meta = extractMetaFromSetup(setup);
      const assetId = (meta.assetId ?? "").toLowerCase();
      if (!assetId) continue;
      if (params.assets && !params.assets.has(assetId)) continue;
      const tf = normTf(meta.timeframe);
      if (!params.timeframes.has(tf)) continue;
      const setupId =
        (setup as { setupId?: string | null }).setupId ??
        (setup as { id?: string | null }).id ??
        null;
      if (!setupId) continue;
      const key = `${snap.id}|${setupId}`.toLowerCase();
      setupMetaMap.set(key, meta);
    }
  }

  return { labelMap, setupMetaMap };
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
  decision?: string | null;
  grade?: string | null;
};

async function loadOutcomes(params: Params, from: Date) {
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

function aggregate(
  params: Params,
  labelMap: Map<string, string>,
  setupMetaMap: SetupMap,
  outcomeRows: OutcomeRow[],
) {
  const statsMap = new Map<string, ByKey>();
  const availability: Availability = {
    playbookId: false,
    decision: false,
    grade: false,
    alignment: false,
    reasons: false,
    segments: false,
    outcomeStatus: false,
    tpSl: false,
  };

  const matchedSampleIds: string[] = [];
  let resolverFallbackCount = 0;
  const dimensionSourceCounts: Report["dimensionSourceCounts"] = {
    playbookId: { persisted: 0, derived: 0, missing: 0 },
    decision: { persisted: 0, derived: 0, missing: 0 },
    grade: { persisted: 0, derived: 0, missing: 0 },
  };

  for (const row of outcomeRows) {
    const label = normLabel(labelMap.get(row.snapshotId) ?? row.label ?? null);
    if (!params.labels.has(label)) continue;
    const assetId = (row.assetId ?? "").toLowerCase();
    if (!assetId) continue;
    if (params.assets && !params.assets.has(assetId)) continue;
    const tf = normTf(row.timeframe);
    if (!params.timeframes.has(tf)) continue;

    const setupKey = `${row.snapshotId}|${row.setupId}`.toLowerCase();
    const meta = setupMetaMap.get(setupKey);

    const alignment = meta?.alignment ?? null;
    let playbookIdSource: "persisted" | "derived" | "missing" = "missing";
    let decisionSource: "persisted" | "derived" | "missing" = "missing";
    let gradeSource: "persisted" | "derived" | "missing" = "missing";

    const persistedPlaybook = meta?.playbookId ?? row.playbookId ?? null;
    let playbookId = persistedPlaybook ?? "unknown";
    if (persistedPlaybook) {
      playbookIdSource = "persisted";
    } else if (
      params.allowDerivedPlaybookFallback &&
      (playbookId === "unknown" || playbookId.toLowerCase() === "generic-swing-v0.1")
    ) {
      const fallback = fallbackPlaybookId(assetId);
      if (fallback) {
        playbookId = fallback;
        playbookIdSource = "derived";
        resolverFallbackCount += 1;
      }
    } else {
      playbookIdSource = "missing";
    }

    const persistedDecision = meta?.decision ?? row.decision ?? null;
    const decision = persistedDecision ?? "unknown";
    decisionSource = persistedDecision ? "persisted" : "missing";

    const persistedGrade = meta?.grade ?? row.grade ?? null;
    const grade = persistedGrade ?? "unknown";
    gradeSource = persistedGrade ? "persisted" : "missing";

    dimensionSourceCounts.playbookId[playbookIdSource] += 1;
    dimensionSourceCounts.decision[decisionSource] += 1;
    dimensionSourceCounts.grade[gradeSource] += 1;
    const reasons =
      (meta?.reasons ?? []) && Array.isArray(meta?.reasons) ? meta?.reasons ?? [] : [];
    const segment = meta?.segment ?? null;

    const key: Key = {
      assetId,
      timeframe: tf,
      label,
      playbookId: playbookId.toLowerCase(),
      decision: decision.toLowerCase(),
      grade: grade.toLowerCase(),
      alignment: alignment ? alignment.toLowerCase() : null,
    };

    const keyStr = `${key.assetId}|${key.timeframe}|${key.label}|${key.playbookId}|${key.decision}|${key.grade}|${key.alignment ?? "null"}`;
    const current =
      statsMap.get(keyStr) ??
      {
        key,
        outcomesTotal: 0,
        closedCount: 0,
        tpCount: 0,
        slCount: 0,
        expiredCount: 0,
        ambiguousCount: 0,
        invalidCount: 0,
        winrate: 0,
        winrateDefinition: "tp/(tp+sl)" as KPI["winrateDefinition"],
      };

    current.outcomesTotal += 1;

    const statusClass = mapOutcomeStatus(row.outcomeStatus);
    current.statusCounts = current.statusCounts ?? {};
    current.statusCounts[statusClass] = (current.statusCounts[statusClass] ?? 0) + 1;
    availability.outcomeStatus = availability.outcomeStatus || statusClass !== "UNKNOWN";

    switch (statusClass) {
      case "TP":
        availability.tpSl = true;
        current.tpCount = (current.tpCount ?? 0) + 1;
        current.closedCount = (current.closedCount ?? 0) + 1;
        break;
      case "SL":
        availability.tpSl = true;
        current.slCount = (current.slCount ?? 0) + 1;
        current.closedCount = (current.closedCount ?? 0) + 1;
        break;
      case "EXPIRED":
        current.expiredCount = (current.expiredCount ?? 0) + 1;
        current.closedCount = (current.closedCount ?? 0) + 1;
        break;
      case "AMBIGUOUS":
        current.ambiguousCount = (current.ambiguousCount ?? 0) + 1;
        current.closedCount = (current.closedCount ?? 0) + 1;
        break;
      case "INVALID":
        current.invalidCount = (current.invalidCount ?? 0) + 1;
        current.closedCount = (current.closedCount ?? 0) + 1;
        break;
      case "OPEN":
        current.openCount = (current.openCount ?? 0) + 1;
        break;
      case "UNKNOWN":
      default:
        current.unknownCount = (current.unknownCount ?? 0) + 1;
        break;
    }

    if (reasons.length) {
      availability.reasons = true;
      current.topReasons = current.topReasons ?? [];
      for (const r of reasons) {
        const existing = current.topReasons.find((x) => x.reason === r);
        if (existing) existing.count += 1;
        else current.topReasons.push({ reason: r, count: 1 });
      }
    }

    if (segment) {
      availability.segments = true;
      current.topSegments = current.topSegments ?? [];
      const existing = current.topSegments.find((x) => x.segment === segment);
      if (existing) existing.count += 1;
      else current.topSegments.push({ segment, count: 1 });
    }

    availability.playbookId = availability.playbookId || playbookIdSource === "persisted";
    availability.decision = availability.decision || decisionSource === "persisted";
    availability.grade = availability.grade || gradeSource === "persisted";
    availability.alignment = availability.alignment || !!alignment;

    statsMap.set(keyStr, current);
    if (matchedSampleIds.length < 10) matchedSampleIds.push(row.outcomeId);
  }

  const byKey = Array.from(statsMap.values()).map((s) => {
    const tp = s.tpCount ?? 0;
    const sl = s.slCount ?? 0;
    const expired = s.expiredCount ?? 0;
    const ambiguous = s.ambiguousCount ?? 0;
    const invalid = s.invalidCount ?? 0;
    const closed = s.closedCount ?? tp + sl + expired + ambiguous + invalid;
    const openCount = s.openCount ?? 0;
    const unknownCount = s.unknownCount ?? 0;
    const closeRate =
      s.outcomesTotal > 0 ? Number(((closed / s.outcomesTotal) * 1.0).toFixed(4)) : undefined;
    let winrateDefinition: KPI["winrateDefinition"] = "unavailable";
    let winrate: number | undefined;
    let winrateTpSl: number | undefined;
    if (tp + sl > 0) {
      winrateDefinition = "tp/(tp+sl)";
      winrate = Number((tp / (tp + sl)).toFixed(4));
      winrateTpSl = winrate;
    }
    const statusCounts = s.statusCounts ?? {};
    return {
      ...s,
      closedCount: closed,
      openCount,
      unknownCount,
      closeRate,
      winrate,
      winrateTpSl,
      statusCounts,
      winrateDefinition,
    };
  });

  const totals = byKey.reduce(
    (acc, curr) => {
      acc.outcomesTotal += curr.outcomesTotal;
      acc.tpCount += curr.tpCount ?? 0;
      acc.slCount += curr.slCount ?? 0;
      acc.expiredCount += curr.expiredCount ?? 0;
      acc.ambiguousCount += curr.ambiguousCount ?? 0;
      acc.invalidCount += curr.invalidCount ?? 0;
      acc.closedCount += curr.closedCount ?? 0;
      acc.openCount += curr.openCount ?? 0;
      acc.unknownCount += curr.unknownCount ?? 0;
      return acc;
    },
    {
      outcomesTotal: 0,
      tpCount: 0,
      slCount: 0,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      closedCount: 0,
      openCount: 0,
      unknownCount: 0,
    },
  );

  let overallWinrate: number | undefined;
  let overallWinrateDefinition: KPI["winrateDefinition"] = "unavailable";
  if (totals.tpCount + totals.slCount > 0) {
    overallWinrateDefinition = "tp/(tp+sl)";
    overallWinrate = Number((totals.tpCount / (totals.tpCount + totals.slCount)).toFixed(4));
  }

  const notes: string[] = [];
  if (
    byKey.length > 0 &&
    byKey.every((k) => k.key.timeframe === "1w" && k.outcomesTotal === 0)
  ) {
    notes.push("Weekly timeframe present but no outcomes in window.");
  }
  if (resolverFallbackCount > 0) {
    notes.push(`Playbook resolver fallback used for ${resolverFallbackCount} outcomes (assetId-based).`);
  }

  const report: Report = {
    version: OUTPUT_VERSION,
    generatedAt: new Date().toISOString(),
    params: {
      days: params.days,
      assets: params.assets ? Array.from(params.assets) : undefined,
      timeframes: Array.from(params.timeframes),
      labels: Array.from(params.labels),
    },
    availability,
    overall: {
      outcomesTotal: totals.outcomesTotal,
      closedCount: totals.closedCount,
      openCount: totals.openCount,
      unknownCount: totals.unknownCount,
      tpCount: totals.tpCount,
      slCount: totals.slCount,
      expiredCount: totals.expiredCount,
      ambiguousCount: totals.ambiguousCount,
      invalidCount: totals.invalidCount,
      winrate: overallWinrate,
      winrateTpSl: overallWinrate,
      winrateDefinition: overallWinrateDefinition,
      closeRate:
        totals.outcomesTotal > 0
          ? Number(((totals.closedCount / totals.outcomesTotal) * 1.0).toFixed(4))
          : undefined,
    },
    byKey: byKey.sort((a, b) =>
      `${a.key.assetId}|${a.key.timeframe}|${a.key.label}`.localeCompare(
        `${b.key.assetId}|${b.key.timeframe}|${b.key.label}`,
      ),
    ),
    notes,
    samples: { matchedSampleIds },
    dimensionSourceCounts,
    fallbackUsedCount: resolverFallbackCount,
    allowDerivedPlaybookFallback: params.allowDerivedPlaybookFallback,
  };

  return report;
}

export function renderMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push("# Swing Outcome Analysis (v1)");
  lines.push(
    `Generated: ${report.generatedAt}, days=${report.params.days}, timeframes=${report.params.timeframes.join(
      ",",
    )}, labels=${report.params.labels.join(",")}, allowDerivedPlaybookFallback=${report.allowDerivedPlaybookFallback}`,
  );
  lines.push("");
  lines.push("## Overall");
  lines.push(
    `- outcomesTotal: ${report.overall.outcomesTotal}\n- closed: ${report.overall.closedCount ?? 0} | open: ${report.overall.openCount ?? 0} | unknown: ${report.overall.unknownCount ?? 0}\n- tp: ${report.overall.tpCount ?? 0} | sl: ${report.overall.slCount ?? 0} | expired: ${report.overall.expiredCount ?? 0} | ambiguous: ${report.overall.ambiguousCount ?? 0} | invalid: ${report.overall.invalidCount ?? 0}\n- winrate tp/(tp+sl): ${report.overall.winrateTpSl ?? "n/a"}\n- closeRate: ${report.overall.closeRate ?? "n/a"}`,
  );
  lines.push(`- fallbackUsedCount: ${report.fallbackUsedCount}`);
  lines.push("");
  lines.push("Status Legend: TP, SL, EXPIRED, AMBIGUOUS, INVALID, OPEN, UNKNOWN");
  lines.push("");
  lines.push("## By Asset/Timeframe/Label/Decision");
  lines.push(
    "| Asset | TF | Label | Playbook | Decision | Grade | Outcomes | TP | SL | Winrate tp/(tp+sl) | CloseRate |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const row of report.byKey) {
    lines.push(
      `| ${row.key.assetId} | ${row.key.timeframe} | ${row.key.label} | ${row.key.playbookId} | ${row.key.decision} | ${row.key.grade} | ${row.outcomesTotal} | ${row.tpCount ?? 0} | ${row.slCount ?? 0} | ${row.winrateTpSl ?? "n/a"} | ${row.closeRate ?? "n/a"} |`,
    );
  }
  if (report.notes.length) {
    lines.push("");
    lines.push("## Notes");
    for (const n of report.notes) {
      lines.push(`- ${n}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const params = parseArgs();
  const from = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);
  const { labelMap, setupMetaMap } = await loadSnapshotMeta(params, from);
  const outcomeRows = await loadOutcomes(params, from);

  const report = aggregate(params, labelMap, setupMetaMap, outcomeRows);
  const md = renderMarkdown(report);

  mkdirSync(OUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:]/g, "-");
  const jsonPath = path.join(OUT_DIR, `swing-outcome-analysis-${ts}-v1.json`);
  const mdPath = path.join(OUT_DIR, `swing-outcome-analysis-${ts}-v1.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, md);

  const latestJson = path.join(OUT_DIR, "swing-outcome-analysis-latest-v1.json");
  const latestMd = path.join(OUT_DIR, "swing-outcome-analysis-latest-v1.md");
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
