import { NextResponse } from "next/server";
import { setPerceptionSnapshot } from "@/src/lib/cache/perceptionCache";
import { addPerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";
import type { PerceptionSnapshot, Setup } from "@/src/lib/engine/types";
import { requestSnapshotBuild } from "@/src/server/perception/snapshotBuildService";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";

type CronSuccessBody = {
  ok: true;
  generatedAt: string;
  totalSetups: number;
};

type CronErrorBody = {
  ok: false;
  error: string;
};

export async function GET(): Promise<NextResponse<CronSuccessBody | CronErrorBody>> {
  const startedAt = Date.now();
  try {
    const result = await requestSnapshotBuild({ source: "cron", force: true });
    const snapshotRecord = result.snapshot.snapshot;
    const snapshotTime =
      snapshotRecord.snapshotTime instanceof Date
        ? snapshotRecord.snapshotTime
        : new Date(snapshotRecord.snapshotTime);
    const setups = (snapshotRecord.setups ?? []) as Setup[];
    const snapshot: PerceptionSnapshot = {
      ...snapshotRecord,
      setups,
      generatedAt: snapshotTime.toISOString(),
      universe: setups.map((setup) => setup.symbol).filter(Boolean),
      setupOfTheDayId: setups[0]?.id ?? snapshotRecord.id,
    };
    addPerceptionHistoryEntry({ snapshot, events: [], biasSnapshot: null });
    setPerceptionSnapshot(snapshot);

    const body: CronSuccessBody = {
      ok: true,
      generatedAt: snapshot.generatedAt,
      totalSetups: setups.length,
    };

    await createAuditRun({
      action: "snapshot_build",
      source: "cron",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "cron_snapshot_build",
      meta: { reused: result.reused, totalSetups: setups.length },
    });
    return NextResponse.json(body);
  } catch (error) {
    console.error("Failed to build perception snapshot", error);
    await createAuditRun({
      action: "snapshot_build",
      source: "cron",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "cron_snapshot_failed",
      error: error instanceof Error ? error.message : "unknown error",
    });
    const body: CronErrorBody = {
      ok: false,
      error: "Failed to build perception snapshot",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
