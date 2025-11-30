"use server";

import { NextResponse } from "next/server";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import { setPerceptionSnapshot } from "@/src/lib/cache/perceptionCache";
import { addPerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";
import { fetchTodayEvents, fetchTodayBiasSnapshot } from "@/src/lib/api/eventsBiasClient";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";

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
    const [events, biasSnapshot] = await Promise.all([
      fetchTodayEvents().catch(() => []),
      fetchTodayBiasSnapshot().catch(() => null),
    ]);
    addPerceptionHistoryEntry({ snapshot, events, biasSnapshot });
    setPerceptionSnapshot(snapshot);

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
