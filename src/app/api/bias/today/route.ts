"use server";

import { NextResponse } from "next/server";
import { mockBiasSnapshot } from "@/src/lib/mockBias";
import type { BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";

type ErrorBody = { error: string };

export async function GET(): Promise<NextResponse<BiasSnapshot | ErrorBody>> {
  try {
    return NextResponse.json<BiasSnapshot>(mockBiasSnapshot);
  } catch (error) {
    console.error("Failed to load bias snapshot", error);
    return NextResponse.json<ErrorBody>({ error: "Failed to load bias snapshot" }, { status: 500 });
  }
}
