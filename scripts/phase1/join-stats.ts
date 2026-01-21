#!/usr/bin/env ts-node
import { writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { and, eq, gte } from "drizzle-orm";
import type { Setup } from "../../src/lib/engine/types";
import { perceptionSnapshots } from "../../src/server/db/schema/perceptionSnapshots";
import { perceptionSnapshotItems } from "../../src/server/db/schema/perceptionSnapshotItems";
import { setupOutcomes } from "../../src/server/db/schema/setupOutcomes";

type Params = {
  days: number;
  assets?: Set<string>;
  timeframes: Set<string>;
  labels: Set<string>;
};

type Key = { assetId: string; timeframe: string; label: string };

export type KeyStats = {
  key: Key;
  setupsTotal: number;
  snapshotsTotal: number;
  outcomesTotal: number;
  matchedOutcomes: number;
  unmatchedOutcomes: number;
  joinRate: number;
};

type OutcomeSample = {
  outcomeId: string;
  snapshotId: string;
  setupId: string;
  assetId: string;
  timeframe: string;
  evaluationTimeframe: string | null;
  outcomeStatus: string | null;
  evaluatedAt: string | null;
  label: string;
};

type ReportPayload = {
  version: string;
  generatedAt: string;
  params: {
    days: number;
    assets?: string[];
    timeframes: string[];
    labels: string[];
  };
  overall: {
    setupsTotal: number;
    outcomesTotal: number;
    matchedOutcomes: number;
    unmatchedOutcomes: number;
    joinRate: number;
  };
  byKey: KeyStats[];
  unmatchedSamples: OutcomeSample[];
  matchedSampleIds: string[];
};

const OUTPUT_VERSION = "v1";
const DEFAULT_DAYS = 30;
const DEFAULT_LABELS = ["eod", "us_open", "morning", "(null)"];
const DEFAULT_TIMEFRAMES = ["1d", "1w"];
const OUT_DIR = path.join(process.cwd(), "artifacts", "phase1");

function parseArgs(): Params {
  const args = process.argv.slice(2);
  let days = DEFAULT_DAYS;
  const assets: Set<string> = new Set();
  let tfSet: Set<string> | null = null;
  let labels: Set<string> | null = null;

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
    }
  }

  return {
    days,
    assets: assets.size ? assets : undefined,
    timeframes: tfSet ?? new Set(DEFAULT_TIMEFRAMES),
    labels: labels ?? new Set(DEFAULT_LABELS),
  };
}

function normalizeLabel(label: string | null): string {
  if (!label) return "(null)";
  return label.toString().toLowerCase() || "(null)";
}

function normalizeTimeframe(tf: string | null | undefined): string {
  return (tf ?? "unknown").toString().toLowerCase();
}

function keyToString(key: Key): string {
  return `${key.assetId}|${key.timeframe}|${key.label}`;
}

function addSetupCount(
  stats: Map<string, KeyStats>,
  key: Key,
  snapshotId: string,
): void {
  const keyStr = keyToString(key);
  const current =
    stats.get(keyStr) ??
    {
      key,
      setupsTotal: 0,
      snapshotsTotal: 0,
      outcomesTotal: 0,
      matchedOutcomes: 0,
      unmatchedOutcomes: 0,
      joinRate: 0,
    };
  current.setupsTotal += 1;
  current.snapshotsTotal += 1; // snapshot counted per setup for simplicity
  stats.set(keyStr, current);
}

function addOutcomeCount(
  stats: Map<string, KeyStats>,
  key: Key,
  matched: boolean,
): void {
  const keyStr = keyToString(key);
  const current = stats.get(keyStr);
  if (!current) {
    stats.set(keyStr, {
      key,
      setupsTotal: 0,
      snapshotsTotal: 0,
      outcomesTotal: 1,
      matchedOutcomes: matched ? 1 : 0,
      unmatchedOutcomes: matched ? 0 : 1,
      joinRate: 0,
    });
    return;
  }
  current.outcomesTotal += 1;
  if (matched) current.matchedOutcomes += 1;
  else current.unmatchedOutcomes += 1;
}

function finalizeStats(stats: Map<string, KeyStats>): KeyStats[] {
  return Array.from(stats.values()).map((s) => ({
    ...s,
    joinRate: s.outcomesTotal
      ? Number((s.matchedOutcomes / s.outcomesTotal).toFixed(4))
      : 0,
  }));
}

export function buildReportPayload(
  params: Params,
  keyStats: KeyStats[],
  unmatchedSamples: OutcomeSample[],
  matchedSampleIds: string[],
): ReportPayload {
  const totals = keyStats.reduce(
    (acc, curr) => {
      acc.setupsTotal += curr.setupsTotal;
      acc.outcomesTotal += curr.outcomesTotal;
      acc.matchedOutcomes += curr.matchedOutcomes;
      acc.unmatchedOutcomes += curr.unmatchedOutcomes;
      return acc;
    },
    { setupsTotal: 0, outcomesTotal: 0, matchedOutcomes: 0, unmatchedOutcomes: 0 },
  );

  const overallJoinRate = totals.outcomesTotal
    ? Number((totals.matchedOutcomes / totals.outcomesTotal).toFixed(4))
    : 0;

  return {
    version: OUTPUT_VERSION,
    generatedAt: new Date().toISOString(),
    params: {
      days: params.days,
      assets: params.assets ? Array.from(params.assets) : undefined,
      timeframes: Array.from(params.timeframes),
      labels: Array.from(params.labels),
    },
    overall: {
      setupsTotal: totals.setupsTotal,
      outcomesTotal: totals.outcomesTotal,
      matchedOutcomes: totals.matchedOutcomes,
      unmatchedOutcomes: totals.unmatchedOutcomes,
      joinRate: overallJoinRate,
    },
    byKey: keyStats.sort((a, b) => keyToString(a.key).localeCompare(keyToString(b.key))),
    unmatchedSamples,
    matchedSampleIds,
  };
}

export function renderMarkdownReport(payload: ReportPayload): string {
  const lines: string[] = [];
  lines.push("# Phase-1 Join Stats (Swing, v1)");
  lines.push(
    `Generated: ${payload.generatedAt}, days=${payload.params.days}, timeframes=${payload.params.timeframes.join(",")}, labels=${payload.params.labels.join(",")}`,
  );
  lines.push("");
  lines.push("## Overall Swing");
  lines.push(
    `- setupsTotal: ${payload.overall.setupsTotal}\n- outcomesTotal: ${payload.overall.outcomesTotal}\n- matchedOutcomes: ${payload.overall.matchedOutcomes}\n- unmatchedOutcomes: ${payload.overall.unmatchedOutcomes}\n- joinRate: ${payload.overall.joinRate}`,
  );
  lines.push("");
  lines.push("## Per Asset/Timeframe/Label");
  lines.push(
    "| Asset | Timeframe | Label | Setups | Outcomes | Matched | Unmatched | JoinRate |",
  );
  lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const k of payload.byKey) {
    lines.push(
      `| ${k.key.assetId} | ${k.key.timeframe} | ${k.key.label} | ${k.setupsTotal} | ${k.outcomesTotal} | ${k.matchedOutcomes} | ${k.unmatchedOutcomes} | ${k.joinRate} |`,
    );
  }
  lines.push("");
  lines.push("## Unmatched Outcome Samples (max 10)");
  if (!payload.unmatchedSamples.length) {
    lines.push("(none)");
  } else {
    lines.push(
      "| outcomeId | snapshotId | setupId | assetId | timeframe | label | status | evaluatedAt | evalTF |",
    );
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const s of payload.unmatchedSamples) {
      lines.push(
        `| ${s.outcomeId} | ${s.snapshotId} | ${s.setupId} | ${s.assetId} | ${s.timeframe} | ${s.label} | ${s.outcomeStatus ?? "-"} | ${s.evaluatedAt ?? "-"} | ${s.evaluationTimeframe ?? "-"} |`,
      );
    }
  }
  return lines.join("\n");
}

async function loadSetupCounts(params: Params, from: Date) {
  const { db } = await import("../../src/server/db/db");
  const rows = await db
    .select()
    .from(perceptionSnapshots)
    .where(and(gte(perceptionSnapshots.snapshotTime, from)));

  const stats = new Map<string, KeyStats>();

  for (const snap of rows) {
    const labelNorm = normalizeLabel(snap.label);
    if (!params.labels.has(labelNorm)) continue;
    const setups = Array.isArray(snap.setups) ? (snap.setups as Setup[]) : [];
    for (const setup of setups) {
      const assetId = ((setup.assetId ?? setup.symbol ?? "") || "unknown").toLowerCase();
      if (params.assets && !params.assets.has(assetId)) continue;
      const timeframe = normalizeTimeframe(setup.timeframeUsed ?? setup.timeframe);
      if (!params.timeframes.has(timeframe)) continue;
      const key: Key = { assetId, timeframe, label: labelNorm };
      addSetupCount(stats, key, snap.id);
    }
  }

  return stats;
}

async function loadOutcomeStats(
  params: Params,
  from: Date,
  stats: Map<string, KeyStats>,
) {
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

  const items = await db
    .select({
      snapshotId: perceptionSnapshotItems.snapshotId,
      setupId: perceptionSnapshotItems.setupId,
    })
    .from(perceptionSnapshotItems);
  const itemSet = new Set(items.map((i) => `${i.snapshotId}|${i.setupId}`));

  const unmatchedSamples: OutcomeSample[] = [];
  const matchedSampleIds: string[] = [];

  for (const row of rows) {
    const labelNorm = normalizeLabel(row.label ?? null);
    if (!params.labels.has(labelNorm)) continue;
    const assetId = (row.assetId ?? "").toLowerCase();
    if (!assetId) continue;
    if (params.assets && !params.assets.has(assetId)) continue;
    const timeframe = normalizeTimeframe(row.timeframe);
    if (!params.timeframes.has(timeframe)) continue;

    const key: Key = { assetId, timeframe, label: labelNorm };
    const matched = itemSet.has(`${row.snapshotId}|${row.setupId}`);
    addOutcomeCount(stats, key, matched);
    const sample: OutcomeSample = {
      outcomeId: row.outcomeId,
      snapshotId: row.snapshotId,
      setupId: row.setupId,
      assetId,
      timeframe,
      evaluationTimeframe: row.evaluationTimeframe ?? null,
      outcomeStatus: row.outcomeStatus ?? null,
      evaluatedAt: row.evaluatedAt ? row.evaluatedAt.toISOString() : null,
      label: labelNorm,
    };
    if (matched) {
      if (matchedSampleIds.length < 10) matchedSampleIds.push(row.outcomeId);
    } else if (unmatchedSamples.length < 10) {
      unmatchedSamples.push(sample);
    }
  }

  return { unmatchedSamples, matchedSampleIds };
}

async function main() {
  config();
  config({ path: ".env.local", override: false });
  const params = parseArgs();
  const from = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);

  const stats = await loadSetupCounts(params, from);
  const { unmatchedSamples, matchedSampleIds } = await loadOutcomeStats(
    params,
    from,
    stats,
  );

  const keyStats = finalizeStats(stats);
  const payload = buildReportPayload(params, keyStats, unmatchedSamples, matchedSampleIds);
  const markdown = renderMarkdownReport(payload);

  mkdirSync(OUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:]/g, "-");
  const jsonPath = path.join(
    OUT_DIR,
    `join-stats-${timestamp}-v1.json`,
  );
  const mdPath = path.join(
    OUT_DIR,
    `join-stats-${timestamp}-v1.md`,
  );
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  writeFileSync(mdPath, markdown);

  const latestJson = path.join(OUT_DIR, "join-stats-latest-v1.json");
  const latestMd = path.join(OUT_DIR, "join-stats-latest-v1.md");
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
