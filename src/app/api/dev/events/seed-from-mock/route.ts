import { NextResponse } from "next/server";
import { mockEvents } from "@/src/lib/mockEvents";
import {
  insertOrUpdateEvents,
  type EventInput,
} from "@/src/server/repositories/eventRepository";

// Dev-only endpoint to seed the events table from mockEvents.
// Intended for local/testing environments to provide sample data for the Event Ring and /api/events/today.

type SeedEventsResponse =
  | { ok: true; count: number }
  | { ok: false; error: string };

function mapSeverityToImpact(severity: string): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

export async function POST(): Promise<NextResponse<SeedEventsResponse>> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Event seeding is disabled in production." },
      { status: 403 },
    );
  }

  try {
    const inputs: EventInput[] = mockEvents.map((event) => ({
      id: event.id,
      providerId: "mock",
      title: event.title,
      description: event.description ?? null,
      category: event.category,
      impact: mapSeverityToImpact(event.severity),
      country: null,
      scheduledAt: new Date(event.startTime),
      actualValue: null,
      previousValue: null,
      forecastValue: null,
      affectedAssets: event.symbols && event.symbols.length ? event.symbols : [],
      source: event.source,
    }));

    await insertOrUpdateEvents(inputs);

    return NextResponse.json({ ok: true, count: inputs.length });
  } catch (error) {
    console.error("Failed to seed events from mock", error);
    return NextResponse.json(
      { ok: false, error: "Failed to seed events from mock" },
      { status: 500 },
    );
  }
}
