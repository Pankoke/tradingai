import { NextResponse } from "next/server";
import type {
  PerceptionSnapshotWithItems,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";

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
    const fallback: PerceptionSnapshotWithItems = {
      snapshot: {
        id: `fallback-${Date.now()}`,
        snapshotTime: new Date(),
        label: null,
        version: snapshot.version,
        dataMode: "mock",
        generatedMs: null,
        notes: null,
        createdAt: new Date(),
      },
      items: [],
    };
    return NextResponse.json(fallback);
  }
}
