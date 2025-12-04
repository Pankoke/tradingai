import { NextResponse } from "next/server";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import { setPerceptionSnapshot } from "@/src/lib/cache/perceptionCache";
import { addPerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";

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
  try {
    const snapshot: PerceptionSnapshot = await buildPerceptionSnapshot();
    addPerceptionHistoryEntry({ snapshot, events: [], biasSnapshot: null });
    setPerceptionSnapshot(snapshot);
    await buildAndStorePerceptionSnapshot({ snapshotTime: new Date(snapshot.generatedAt) });

    const body: CronSuccessBody = {
      ok: true,
      generatedAt: snapshot.generatedAt,
      totalSetups: snapshot.setups.length,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("Failed to build perception snapshot", error);
    const body: CronErrorBody = {
      ok: false,
      error: "Failed to build perception snapshot",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
