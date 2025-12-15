import { NextResponse } from "next/server";
import type { PerceptionSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import {
  requestSnapshotBuild,
  SnapshotBuildInProgressError,
} from "@/src/server/perception/snapshotBuildService";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { isPerceptionMockMode } from "@/src/lib/config/perceptionDataMode";
import { loadLatestSnapshotFromStore } from "@/src/features/perception/cache/snapshotStore";
import { logger } from "@/src/lib/logger";

type ErrorBody = {
  error: string;
};

export async function GET(): Promise<NextResponse<PerceptionSnapshotWithItems | ErrorBody>> {
  if (isPerceptionMockMode()) {
    const fallback = await buildEngineSnapshotResponse("mock");
    return NextResponse.json(fallback);
  }

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
      const latest = await loadLatestSnapshotFromStore();
      if (latest) {
        return NextResponse.json(latest);
      }
    }
    logger.error("Failed to persist perception snapshot, using engine fallback", {
      error: error instanceof Error ? error.message : "unknown",
    });
    await createAuditRun({
      action: "snapshot_build",
      source: "ui",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "fallback_engine_result",
      error: error instanceof Error ? error.message : "unknown error",
    });
    const fallback = await buildEngineSnapshotResponse("fallback");
    return NextResponse.json(fallback);
  }
}

async function buildEngineSnapshotResponse(mode: "mock" | "fallback"): Promise<PerceptionSnapshotWithItems> {
  const snapshot = await buildPerceptionSnapshot();
  const fallbackSnapshotTime = new Date();
  const isoCreatedAt = fallbackSnapshotTime.toISOString();
  const snapshotId = `${mode}-${Date.now()}`;
  const setupsWithMetadata = snapshot.setups.map((setup) => ({
    ...setup,
    snapshotId,
    snapshotCreatedAt: isoCreatedAt,
  }));
  return {
    snapshot: {
      id: snapshotId,
      snapshotTime: fallbackSnapshotTime,
      label: null,
      version: snapshot.version,
      dataMode: mode === "mock" ? "mock" : "live",
      generatedMs: null,
      notes: JSON.stringify({ source: mode }),
      setups: setupsWithMetadata,
      createdAt: fallbackSnapshotTime,
    },
    items: [],
    setups: setupsWithMetadata,
  };
}
