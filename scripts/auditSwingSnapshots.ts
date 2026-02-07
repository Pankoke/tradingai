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
    .orderBy(desc(perceptionSnapshots.snapshotTime));

  const setups: Setup[] = [];
  for (const snap of rows) {
    const parsed = (snap.setups ?? []) as Setup[];
    parsed
      .filter((s) => s.profile === "SWING")
      .forEach((s) => setups.push(s));
  }
  return setups;
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
      });
    }
    const agg = map.get(key)!;
    const decision: DecisionKey =
      setup.decision === "TRADE" || setup.decision === "WATCH" || setup.decision === "NO_TRADE"
        ? setup.decision
        : "NO_TRADE";
    agg.decisionCounts[decision] += 1;
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
    if (setup.levelDebug?.refinementUsed) {
      agg.refinementUsed += 1;
    }
    if (setup.levelDebug?.levelsRefinementApplied) {
      agg.refinementApplied += 1;
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
    "| assetId | playbookId | TRADE | WATCH | NO_TRADE | BLOCKED | top 3 reasons | has4H | refinement applied/used |\n" +
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |";
  const rows = aggs
    .map((a) => {
      const top = a.topReasons.slice(0, 3).map((r) => `${r.reason} (${r.count})`).join("; ");
      const refinementText = a.refinementUsed > 0 ? `${a.refinementApplied}/${a.refinementUsed}` : "0/0";
      return `| ${a.assetId} | ${a.playbookMode} | ${a.decisionPerc.TRADE}% (${a.decisionCounts.TRADE}) | ${a.decisionPerc.WATCH}% (${a.decisionCounts.WATCH}) | ${a.decisionPerc.NO_TRADE}% (${a.decisionCounts.NO_TRADE}) | ${a.decisionPerc.BLOCKED}% (${a.decisionCounts.BLOCKED}) | ${top || "—"} | ${a.has4h ? "yes" : "no"} | ${refinementText} |`;
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

async function main() {
  const setups = await loadSwingSetups();
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
}

main().catch((err) => {
  console.error("[audit:swing-snapshots] Fehler:", err?.message ?? err);
  process.exit(1);
});
