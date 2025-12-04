import { NextResponse } from "next/server";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import { setPerceptionSnapshot } from "@/src/lib/cache/perceptionCache";
import { addPerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";
import { fetchTodayEvents, fetchTodayBiasSnapshot } from "@/src/lib/api/eventsBiasClient";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";

const isBiasDebug = process.env.DEBUG_BIAS === "1";
const isServer = typeof window === "undefined";
const logBiasDebug = (...args: unknown[]) => {
  if (isBiasDebug && isServer) {
    console.log(...args);
  }
};

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
  logBiasDebug("[PerceptionCron:start]", {
    mode: process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE,
    nodeEnv: process.env.NODE_ENV,
  });
  try {
    const snapshot: PerceptionSnapshot = await buildPerceptionSnapshot();
    const [events, biasSnapshot] = await Promise.all([
      fetchTodayEvents().catch(() => []),
      fetchTodayBiasSnapshot().catch(() => null),
    ]);
    addPerceptionHistoryEntry({ snapshot, events, biasSnapshot });
    setPerceptionSnapshot(snapshot);
    await buildAndStorePerceptionSnapshot({ snapshotTime: new Date(snapshot.generatedAt) });

    logBiasDebug("[PerceptionCron:finished]", {
      generatedAt: snapshot.generatedAt,
      totalSetups: snapshot.setups.length,
    });

    const body: CronSuccessBody = {
      ok: true,
      generatedAt: snapshot.generatedAt,
      totalSetups: snapshot.setups.length,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("[PerceptionCron:error]", error);
    const body: CronErrorBody = {
      ok: false,
      error: "Failed to build perception snapshot",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
