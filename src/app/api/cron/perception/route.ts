"use server";

import { NextResponse } from "next/server";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import { setPerceptionSnapshot } from "@/src/lib/cache/perceptionCache";
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
