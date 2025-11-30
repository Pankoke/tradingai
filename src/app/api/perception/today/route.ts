"use server";

import { NextResponse } from "next/server";
import type {
  PerceptionSnapshotWithItems,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";

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
    const latest = await getLatestSnapshot();

    if (latest && isSnapshotFromToday(latest.snapshot.snapshotTime)) {
      return NextResponse.json(latest);
    }

    const refreshed = await buildAndStorePerceptionSnapshot();
    return NextResponse.json(refreshed);
  } catch (error) {
    console.error("Failed to load perception snapshot", error);
    return NextResponse.json(
      { error: "Failed to build perception snapshot" },
      { status: 500 },
    );
  }
}
