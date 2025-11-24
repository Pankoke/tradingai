"use server";

import { NextResponse } from "next/server";
import { getPerceptionSnapshot } from "@/src/lib/cache/perceptionCache";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";

type ErrorBody = {
  error: string;
};

export async function GET(): Promise<NextResponse<PerceptionSnapshot | ErrorBody>> {
  try {
    const cached = getPerceptionSnapshot();
    const snapshot = cached ?? (await buildPerceptionSnapshot());
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Failed to load perception snapshot", error);
    return NextResponse.json({ error: "Failed to load perception snapshot" }, { status: 500 });
  }
}
