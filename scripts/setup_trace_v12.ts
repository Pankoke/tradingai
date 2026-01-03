import "dotenv/config";
import "tsconfig-paths/register";

import { format } from "node:util";
import { and, eq } from "drizzle-orm";
import { getSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import { setupOutcomes } from "@/src/server/db/schema/setupOutcomes";
import { db } from "@/src/server/db/db";
import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";
import { computeLevelsForSetup } from "@/src/lib/engine/levels";
import type { Setup } from "@/src/lib/engine/types";

type OutcomeRow = typeof setupOutcomes.$inferSelect;

async function getOutcomeBySnapshotSetup(snapshotId: string, setupId: string): Promise<OutcomeRow | null> {
  const [row] = await db
    .select()
    .from(setupOutcomes)
    .where(and(eq(setupOutcomes.snapshotId, snapshotId), eq(setupOutcomes.setupId, setupId)))
    .limit(1);
  return row ?? null;
}

function toNumberOrNull(value?: string | null): number | null {
  if (!value) return null;
  const nums = value.match(/-?\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(",", "."))) ?? [];
  if (!nums.length) return null;
  const sorted = nums.sort((a, b) => a - b);
  return (sorted[0] + sorted[sorted.length - 1]) / 2;
}

async function main(): Promise<void> {
  const snapshotId = process.argv.find((arg) => arg.startsWith("--snapshotId="))?.replace("--snapshotId=", "");
  const setupId = process.argv.find((arg) => arg.startsWith("--setupId="))?.replace("--setupId=", "");

  if (!snapshotId || !setupId) {
    console.error("Usage: ts-node scripts/setup_trace_v12.ts --snapshotId=<id> --setupId=<id>");
    process.exit(1);
  }

  const snapshot = await getSnapshotWithItems(snapshotId);
  if (!snapshot) {
    console.error(`Snapshot not found: ${snapshotId}`);
    process.exit(1);
  }
  const setup = snapshot.setups.find((s) => s.id === setupId);
  if (!setup) {
    console.error(`Setup not found in snapshot: ${setupId}`);
    process.exit(1);
  }

  const resolvedPlaybook = resolvePlaybookWithReason(
    { id: setup.assetId, symbol: setup.symbol, name: (setup as { name?: string }).name },
    setup.profile ?? "SWING",
  );
  const levels = computeLevelsForSetup({
    direction: setup.direction.toLowerCase() as "long" | "short" | "neutral",
    referencePrice: Number((setup as { referencePrice?: number }).referencePrice ?? toNumberOrNull(setup.entryZone) ?? 0),
    volatilityScore: setup.eventScore,
    confidence: setup.confidence,
    category: (setup.type as any) ?? "unknown",
    profile: (setup.profile as any) ?? "SWING",
  });

  const outcome = await getOutcomeBySnapshotSetup(snapshotId, setupId);

  const summary = {
    snapshotId,
    snapshotVersion: snapshot.snapshot.version,
    snapshotTime: snapshot.snapshot.snapshotTime,
    setup: {
      id: setup.id,
      assetId: setup.assetId,
      symbol: setup.symbol,
      direction: setup.direction,
      profile: setup.profile,
      timeframe: setup.timeframe,
      setupPlaybookId: (setup as { setupPlaybookId?: string | null }).setupPlaybookId ?? null,
      resolvedPlaybook: resolvedPlaybook.playbook.id,
      resolvedReason: resolvedPlaybook.reason,
      grade: setup.setupGrade ?? null,
      noTradeReason: setup.noTradeReason ?? null,
      gradeDebugReason: setup.gradeDebugReason ?? null,
      referencePrice: (setup as { referencePrice?: number }).referencePrice ?? null,
      eventScore: setup.eventScore,
      biasScore: setup.biasScore,
      trendScore: setup.biasScore,
      sentimentScore: setup.sentimentScore,
      orderflowScore: setup.balanceScore,
    },
    levels: {
      entryZone: setup.entryZone ?? null,
      stopLoss: setup.stopLoss ?? null,
      takeProfit: setup.takeProfit ?? null,
      riskReward: setup.riskReward ?? null,
      computed: levels,
      entryMid: toNumberOrNull(setup.entryZone),
      stopMid: toNumberOrNull(setup.stopLoss),
      takeMid: toNumberOrNull(setup.takeProfit),
    },
    outcome: outcome
      ? {
          status: outcome.outcomeStatus,
          reason: outcome.reason,
          windowBars: outcome.windowBars,
          evaluatedAt: outcome.evaluatedAt,
        }
      : null,
  };

  console.log(format("%j", summary));
  console.log("\nReadable:");
  console.log(`Snapshot ${snapshotId} (${snapshot.snapshot.version}) at ${snapshot.snapshot.snapshotTime}`);
  console.log(
    `Setup ${setup.id} asset=${setup.assetId}/${setup.symbol} playbook=${resolvedPlaybook.playbook.id} grade=${setup.setupGrade ?? "-"}`,
  );
  console.log(`Levels entry=${setup.entryZone} sl=${setup.stopLoss} tp=${setup.takeProfit} ref=${summary.setup.referencePrice}`);
  if (outcome) {
    console.log(`Outcome: ${outcome.outcomeStatus} reason=${outcome.reason ?? "-"} window=${outcome.windowBars}`);
  } else {
    console.log("Outcome: none in setup_outcomes");
  }
}

main().catch((error) => {
  console.error("setup trace failed", error);
  process.exit(1);
});
