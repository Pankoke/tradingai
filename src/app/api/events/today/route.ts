"use server";

import { NextResponse } from "next/server";
import { mockEvents } from "@/src/lib/mockEvents";
import type { Event } from "@/src/lib/engine/eventsBiasTypes";

type SuccessBody = { events: Event[] };
type ErrorBody = { error: string };

export async function GET(): Promise<NextResponse<SuccessBody | ErrorBody>> {
  try {
    return NextResponse.json<SuccessBody>({ events: mockEvents });
  } catch (error) {
    console.error("Failed to load events", error);
    return NextResponse.json<ErrorBody>({ error: "Failed to load events" }, { status: 500 });
  }
}
