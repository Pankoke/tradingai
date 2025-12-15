import { NextResponse } from "next/server";
import type {
  PerceptionSnapshotWithItems,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import {
  requestSnapshotBuild,
  SnapshotBuildInProgressError,
} from "@/src/server/perception/snapshotBuildService";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";

type ErrorBody = {
  error: string;
};

export async function GET(): Promise<NextResponse<PerceptionSnapshotWithItems | ErrorBody>> {
  const startedAt = Date.now();
  try {
    const result = await requestSnapshotBuild({ source: "ui" });
    await createAuditRun({
      action: "snapshot_build",
      source: "ui",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: result.reused ? "reused_snapshot" : "snapshot_built",
      meta: { reused: result.reused },
    });
    return NextResponse.json(result.snapshot);
  } catch (error) {
    if (error instanceof SnapshotBuildInProgressError) {
      await createAuditRun({
        action: "snapshot_build",
        source: "ui",
        ok: false,
        durationMs: Date.now() - startedAt,
        message: "lock_in_progress",
      });
      const latest = await getLatestSnapshot();
      if (latest) {
        return NextResponse.json(latest);
      }
    }
    console.error("Failed to persist perception snapshot, falling back to engine result", error);
    await createAuditRun({
      action: "snapshot_build",
      source: "ui",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "fallback_engine_result",
      error: error instanceof Error ? error.message : "unknown error",
    });
    const snapshot = await buildPerceptionSnapshot();
    const fallbackSnapshotTime = new Date();
    const isoCreatedAt = fallbackSnapshotTime.toISOString();
    const snapshotId = `fallback-${Date.now()}`;
    const setupsWithMetadata = snapshot.setups.map((setup) => ({
      ...setup,
      snapshotId,
      snapshotCreatedAt: isoCreatedAt,
    }));
    const fallback: PerceptionSnapshotWithItems = {
      snapshot: {
        id: snapshotId,
        snapshotTime: fallbackSnapshotTime,
        label: null,
        version: snapshot.version,
        dataMode: "mock",
        generatedMs: null,
        notes: null,
        setups: setupsWithMetadata,
        createdAt: fallbackSnapshotTime,
      },
      items: [],
      setups: setupsWithMetadata,
    };
    return NextResponse.json(fallback);
  }
}
