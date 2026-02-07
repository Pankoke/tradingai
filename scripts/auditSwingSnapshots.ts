import "dotenv/config";
import "tsconfig-paths/register";

import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  console.error("[audit:swing-snapshots] DATABASE_URL not set – skipping (read-only audit requires DB access).");
  process.exit(0);
}

import { and, desc, gte, lte } from "drizzle-orm";
import { db } from "@/src/server/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import type { Setup } from "@/src/lib/engine/types";

const DECISION_KEYS = ["TRADE", "WATCH", "NO_TRADE", "BLOCKED"] as const;
type DecisionKey = (typeof DECISION_KEYS)[number];

type AssetAgg = {
  assetId: string;
  symbol: string;
  playbookMode: string;
  decisionCounts: Record<DecisionKey, number>;
  decisionPerc: Record<DecisionKey, number>;
  topReasons: { reason: string; count: number }[];
  gradeCounts?: Record<string, number>;
  has4h?: boolean;
  refinementUsed: number;
  refinementApplied: number;
  refinementAttempted: number;
  refinementReasons: Record<string, number>;
  boundsModeCount: Record<"ATR1D" | "PCT", number>;
  deltaEntry: number[];
  deltaStop: number[];
  deltaTp: number[];
  decisionByApplied: {
    applied: Record<DecisionKey, number>;
    notApplied: Record<DecisionKey, number>;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 60;

async function loadSwingSetups(): Promise<Setup[]> {
  const to = new Date();
  const from = new Date(to.getTime() - LOOKBACK_DAYS * DAY_MS);
  const rows = await db
    .select()
    .from(perceptionSnapshots)
    .where(and(gte(perceptionSnapshots.snapshotTime, from), lte(perceptionSnapshots.snapshotTime, to)))
    .orderBy(desc(perceptionSnapshots.snapshotTime))
    .limit(5000);

  const setups: Setup[] = [];
  for (const snap of rows) {
    const parsed = (snap.setups ?? []) as Setup[];
    parsed
      .filter((s) => s.profile === "SWING")
      .forEach((s) => setups.push(s));
  }
  return setups;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms while querying DB`)), ms),
    ),
  ]) as Promise<T>;
}

function aggregate(setups: Setup[]): AssetAgg[] {
  const map = new Map<string, AssetAgg>();
  setups.forEach((setup) => {
    const key = setup.assetId ?? setup.symbol;
    if (!map.has(key)) {
      map.set(key, {
        assetId: setup.assetId ?? key,
        symbol: setup.symbol,
        playbookMode: setup.playbookId ?? "unknown",
        decisionCounts: { TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0 },
        decisionPerc: { TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0 },
        topReasons: [],
        gradeCounts: {},
        has4h:
          Boolean(setup.orderflow?.meta?.timeframeSamples?.["4H"]) ||
          setup.levelDebug?.levelsRefinementTimeframe === "4H" ||
          setup.levelDebug?.refinementSource === "4H",
        refinementUsed: 0,
        refinementApplied: 0,
        refinementAttempted: 0,
        refinementReasons: {},
        boundsModeCount: { ATR1D: 0, PCT: 0 },
        deltaEntry: [],
        deltaStop: [],
        deltaTp: [],
        decisionByApplied: {
          applied: { TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0 },
          notApplied: { TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0 },
        },
      });
    }
    const agg = map.get(key)!;
    const decision: DecisionKey =
      setup.decision === "TRADE" || setup.decision === "WATCH" || setup.decision === "NO_TRADE"
        ? setup.decision
        : "NO_TRADE";
    agg.decisionCounts[decision] += 1;
    const applied = Boolean(setup.levelDebug?.levelsRefinementApplied);
    const appliedBucket = applied ? "applied" : "notApplied";
    agg.decisionByApplied[appliedBucket as "applied" | "notApplied"][decision] += 1;
    if (setup.grade) {
      agg.gradeCounts![setup.grade] = (agg.gradeCounts![setup.grade] ?? 0) + 1;
    }
    if (Array.isArray(setup.decisionReasons)) {
      setup.decisionReasons.forEach((r) => {
        const entry = agg.topReasons.find((x) => x.reason === r);
        if (entry) entry.count += 1;
        else agg.topReasons.push({ reason: r, count: 1 });
      });
    }
    agg.playbookMode = setup.playbookId ?? agg.playbookMode;
    const reason =
      setup.levelDebug?.levelsRefinementReason ??
      setup.levelDebug?.refinementReason ??
      (setup.levelDebug?.refinementUsed ? "applied" : "missing");
    if (reason) {
      agg.refinementReasons[reason] = (agg.refinementReasons[reason] ?? 0) + 1;
    }
    if (setup.levelDebug?.refinementAttempted) {
      agg.refinementAttempted += 1;
    }
    if (setup.levelDebug?.refinementUsed) {
      agg.refinementUsed += 1;
    }
    if (setup.levelDebug?.levelsRefinementApplied) {
      agg.refinementApplied += 1;
    }
    const boundsMode = setup.levelDebug?.refinementEffect?.boundsMode;
    if (boundsMode === "ATR1D" || boundsMode === "PCT") {
      agg.boundsModeCount[boundsMode] += 1;
    }
    if (setup.levelDebug?.refinementEffect) {
      const { entryDeltaPct, stopDeltaPct, tpDeltaPct } = setup.levelDebug.refinementEffect;
      if (typeof entryDeltaPct === "number") agg.deltaEntry.push(entryDeltaPct);
      if (typeof stopDeltaPct === "number") agg.deltaStop.push(stopDeltaPct);
      if (typeof tpDeltaPct === "number") agg.deltaTp.push(tpDeltaPct);
    }
  });

  Array.from(map.values()).forEach((agg) => {
    const total = DECISION_KEYS.reduce((sum, k) => sum + agg.decisionCounts[k], 0);
    if (total > 0) {
      DECISION_KEYS.forEach((k) => {
        agg.decisionPerc[k] = Math.round((agg.decisionCounts[k] / total) * 1000) / 10;
      });
    }
    agg.topReasons.sort((a, b) => b.count - a.count);
    agg.topReasons = agg.topReasons.slice(0, 10);
  });

  return Array.from(map.values()).sort((a, b) => a.assetId.localeCompare(b.assetId));
}

function renderTable(aggs: AssetAgg[]): string {
  const header =
    "| assetId | playbookId | TRADE | WATCH | NO_TRADE | BLOCKED | top 3 reasons | has4H | refinement applied/used | p50 entryDelta | p90 entryDelta | bounds ATR/PCT |\n" +
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";
  const rows = aggs
    .map((a) => {
      const top = a.topReasons.slice(0, 3).map((r) => `${r.reason} (${r.count})`).join("; ");
      const refinementText = a.refinementUsed > 0 ? `${a.refinementApplied}/${a.refinementUsed}` : "0/0";
      const entryP50 = percentile(a.deltaEntry, 50);
      const entryP90 = percentile(a.deltaEntry, 90);
      const boundsText = `${a.boundsModeCount.ATR1D}/${a.boundsModeCount.PCT}`;
      return `| ${a.assetId} | ${a.playbookMode} | ${a.decisionPerc.TRADE}% (${a.decisionCounts.TRADE}) | ${a.decisionPerc.WATCH}% (${a.decisionCounts.WATCH}) | ${a.decisionPerc.NO_TRADE}% (${a.decisionCounts.NO_TRADE}) | ${a.decisionPerc.BLOCKED}% (${a.decisionCounts.BLOCKED}) | ${top || "—"} | ${a.has4h ? "yes" : "no"} | ${refinementText} | ${formatPct(entryP50)} | ${formatPct(entryP90)} | ${boundsText} |`;
    })
    .join("\n");
  return `${header}\n${rows}`;
}

function summarize(aggs: AssetAgg[]): string {
  const watchHeavy = [...aggs].sort((a, b) => b.decisionPerc.WATCH - a.decisionPerc.WATCH).slice(0, 5);
  const topBlockedReasons: Record<string, number> = {};
  aggs.forEach((a) => {
    if (a.topReasons.length && a.decisionCounts.BLOCKED > 0) {
      a.topReasons.forEach((r) => {
        topBlockedReasons[r.reason] = (topBlockedReasons[r.reason] ?? 0) + r.count;
      });
    }
  });
  const blockedSorted = Object.entries(topBlockedReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => `- ${reason} (${count})`)
    .join("\n");

  const watchLines = watchHeavy
    .map((a) => `- ${a.assetId}: WATCH ${a.decisionPerc.WATCH}% (${a.decisionCounts.WATCH})`)
    .join("\n");

  return `### Höchster WATCH-Anteil (Top 5)\n${watchLines || "- n/a"}\n\n### Top BLOCKED-Reasons\n${blockedSorted || "- n/a"}`;
}

function renderDecisionCoupling(aggs: AssetAgg[]): string {
  const lines = aggs.map((a) => {
    const appliedTotal = DECISION_KEYS.reduce((s, k) => s + a.decisionByApplied.applied[k], 0);
    const notAppliedTotal = DECISION_KEYS.reduce((s, k) => s + a.decisionByApplied.notApplied[k], 0);
    const lineApplied = DECISION_KEYS.map(
      (k) =>
        `${k}: ${a.decisionByApplied.applied[k]}${
          appliedTotal ? ` (${formatPctSafe(a.decisionByApplied.applied[k] / appliedTotal)})` : ""
        }`,
    ).join(", ");
    const lineNotApplied = DECISION_KEYS.map(
      (k) =>
        `${k}: ${a.decisionByApplied.notApplied[k]}${
          notAppliedTotal ? ` (${formatPctSafe(a.decisionByApplied.notApplied[k] / notAppliedTotal)})` : ""
        }`,
    ).join(", ");
    return `- ${a.assetId}: applied(${appliedTotal}) [${lineApplied}] | notApplied(${notAppliedTotal}) [${lineNotApplied}]`;
  });
  return lines.join("\n");
}

function renderRefinementReasons(aggs: AssetAgg[]): string {
  return aggs
    .map((a) => {
      const reasons = Object.entries(a.refinementReasons)
        .sort((x, y) => y[1] - x[1])
        .map(([r, c]) => `${r}:${c}`)
        .join(", ");
      return `- ${a.assetId}: ${reasons || "n/a"}`;
    })
    .join("\n");
}

function renderTopRefinementReasons(aggs: AssetAgg[]): string {
  const totals: Record<string, number> = {};
  for (const agg of aggs) {
    for (const [reason, count] of Object.entries(agg.refinementReasons)) {
      totals[reason] = (totals[reason] ?? 0) + count;
    }
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => `- ${reason}: ${count}`)
    .join("\n");
}

function renderBoundsMode(aggs: AssetAgg[]): string {
  return aggs
    .map((a) => `- ${a.assetId}: ATR1D=${a.boundsModeCount.ATR1D}, PCT=${a.boundsModeCount.PCT}`)
    .join("\n");
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function formatPct(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

function formatPctSafe(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return `${Math.round(value * 1000) / 10}%`;
}

async function main() {
  let setups: Setup[] = [];
  try {
    setups = await withTimeout(loadSwingSetups(), 15000);
  } catch (err) {
    const msg = `[audit:swing-snapshots] DB nicht erreichbar: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    const fallbackContent =
      `# Swing 4H Refinement Verification\n\n${msg}\n\nKeine Daten geladen (read-only Audit, DB required).`;
    const outVerification = resolve("reports", "audits", "swing-4h-refinement-verification.md");
    writeFileSync(outVerification, fallbackContent, "utf8");
    console.log(`[audit:swing-snapshots] geschrieben (fallback): ${outVerification}`);
    process.exit(0);
  }
  if (!setups.length) {
    console.error("[audit:swing-snapshots] Keine Swing-Setups in den letzten 60 Tagen gefunden – abbrechen.");
    process.exit(0);
  }
  const aggs = aggregate(setups);
  const table = renderTable(aggs);
  const summary = summarize(aggs);
  const content =
    `# Swing Snapshots Metrics (read-only)\n\n` +
    `Quelle: perception_snapshots (DB), Zeitraum: letzte ${LOOKBACK_DAYS} Tage (falls vorhanden)\n` +
    `Abfragezeit: ${new Date().toISOString()}\n\n` +
    `## Pro Asset\n${table}\n\n` +
    `## Zusammenfassung\n${summary}\n`;

  const outPath = resolve("reports", "audits", "swing-snapshots-metrics.md");
  writeFileSync(outPath, content, "utf8");
  console.log(`[audit:swing-snapshots] geschrieben: ${outPath}`);

  // Verification report focused on 4H refinement coupling/coverage
  const totalRefinementUsed = aggs.reduce((s, a) => s + a.refinementUsed, 0);
  const totalRefinementApplied = aggs.reduce((s, a) => s + a.refinementApplied, 0);
  const totalRefinementAttempted = aggs.reduce((s, a) => s + a.refinementAttempted, 0);
  const totalSetups = aggs.reduce((s, a) => s + DECISION_KEYS.reduce((x, k) => x + a.decisionCounts[k], 0), 0);
  const appliedRate = totalRefinementUsed ? totalRefinementApplied / totalRefinementUsed : 0;
  const attemptRate = totalSetups ? totalRefinementAttempted / totalSetups : 0;
  const conversionRate = totalRefinementAttempted ? totalRefinementApplied / totalRefinementAttempted : 0;
  const globalBoundsAtr = aggs.reduce((s, a) => s + a.boundsModeCount.ATR1D, 0);
  const globalBoundsPct = aggs.reduce((s, a) => s + a.boundsModeCount.PCT, 0);

  const alerts: string[] = [];
  if (appliedRate < 0.05) {
    alerts.push(
      "- refinementAppliedRate < 5%: Not effective yet (moegliche Ursachen: fehlende 4H-Candles, Freshness-Gate, Telemetry nicht vorhanden, ATR-Bounds zu strikt).",
    );
  }
  if (globalBoundsPct > globalBoundsAtr) {
    alerts.push(
      "- boundsMode haeufig PCT_FALLBACK: ATR1D oft nicht verfuegbar (zu kurze Historie oder fehlende 1D-Candles).",
    );
  }

  const verification =
    `# Swing 4H Refinement Verification (read-only)\n\n` +
    `Quelle: perception_snapshots (DB), Zeitraum: letzte ${LOOKBACK_DAYS} Tage\n` +
    `Abfragezeit: ${new Date().toISOString()}\n\n` +
    `## Kennzahlen (gesamt)\n` +
    `- Setups total: ${totalSetups}\n` +
    `- refinementAttempted: ${totalRefinementAttempted} (${formatPctSafe(attemptRate)})\n` +
    `- refinementUsed: ${totalRefinementUsed}\n` +
    `- refinementApplied: ${totalRefinementApplied} (${formatPctSafe(appliedRate)})\n` +
    `- attempt→applied conversion: ${formatPctSafe(conversionRate)}\n` +
    `- boundsMode ATR1D/PCT: ${globalBoundsAtr}/${globalBoundsPct}\n` +
    `${alerts.length ? "### Alerts\n" + alerts.join("\n") + "\n\n" : ""}` +
    `## Decision Coupling Check\n${renderDecisionCoupling(aggs)}\n\n` +
    `## Top Skipped/Failed Reasons\n${renderTopRefinementReasons(aggs) || "- n/a"}\n\n` +
    `## Refinement Reasons Breakdown\n${renderRefinementReasons(aggs)}\n\n` +
    `## Bounds Mode Breakdown\n${renderBoundsMode(aggs)}\n\n` +
    `## Per-Asset Tabelle\n${table}\n`;

  const outVerification = resolve("reports", "audits", "swing-4h-refinement-verification.md");
  writeFileSync(outVerification, verification, "utf8");
  console.log(`[audit:swing-snapshots] geschrieben: ${outVerification}`);
}

main().catch((err) => {
  console.error("[audit:swing-snapshots] Fehler:", err?.message ?? err);
  process.exit(1);
});
