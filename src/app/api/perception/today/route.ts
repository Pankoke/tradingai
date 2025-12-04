import { NextResponse } from "next/server";
import type {
  PerceptionSnapshotWithItems,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";

const isBiasDebug = process.env.DEBUG_BIAS === "1";
const isServer = typeof window === "undefined";

function redactDbUrl(raw?: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return { host: url.host, database: url.pathname.replace(/\//g, "") };
  } catch {
    return "invalid_url";
  }
}

type ErrorBody = {
  error: string;
};

function isSnapshotFromToday(snapshotTime: Date): boolean {
  const nowUtc = new Date();
  const snapshotDate = new Date(snapshotTime);
  return (
    snapshotDate.getUTCFullYear() === nowUtc.getUTCFullYear() &&
    snapshotDate.getUTCMonth() === nowUtc.getUTCMonth() &&
    snapshotDate.getUTCDate() === nowUtc.getUTCDate()
  );
}

export async function GET(): Promise<NextResponse<PerceptionSnapshotWithItems | ErrorBody>> {
  if (isBiasDebug && isServer) {
    console.log("[PerceptionToday:handler]", {
      mode: process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE,
      nodeEnv: process.env.NODE_ENV,
      db: redactDbUrl(process.env.DATABASE_URL),
    });
  }

  try {
    const { getLatestSnapshot } = await import(
      "@/src/server/repositories/perceptionSnapshotRepository"
    );
    const latest = await getLatestSnapshot();

    if (latest && isSnapshotFromToday(latest.snapshot.snapshotTime)) {
      return NextResponse.json(latest);
    }

    const { buildAndStorePerceptionSnapshot } = await import(
      "@/src/features/perception/build/buildSetups"
    );
    const refreshed = await buildAndStorePerceptionSnapshot();
    return NextResponse.json(refreshed);
  } catch (error) {
    console.error("Failed to persist perception snapshot, falling back to engine result", error);
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
