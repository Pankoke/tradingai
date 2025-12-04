import { NextResponse } from "next/server";
import { mockEvents } from "@/src/lib/mockEvents";
import type { Event } from "@/src/lib/engine/eventsBiasTypes";
import { isPerceptionMockMode } from "@/src/lib/config/perceptionDataMode";
import { getEventsInRange } from "@/src/server/repositories/eventRepository";

type SuccessBody = { events: Event[] };
type ErrorBody = { error: string };

export async function GET(): Promise<NextResponse<SuccessBody | ErrorBody>> {
  try {
    if (isPerceptionMockMode()) {
      return NextResponse.json<SuccessBody>({ events: mockEvents });
    }

    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const rows = await getEventsInRange({ from, to });

    const mapSeverity = (impact: number): Event["severity"] => {
      if (impact >= 3) return "high";
      if (impact === 2) return "medium";
      return "low";
    };

    const mapCategory = (value: string): Event["category"] => {
      const allowed: Event["category"][] = ["macro", "crypto", "onchain", "technical", "other"];
      return allowed.includes(value as Event["category"]) ? (value as Event["category"]) : "other";
    };

    const events: Event[] = rows
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? "",
        category: mapCategory(row.category),
        severity: mapSeverity(row.impact),
        startTime: row.scheduledAt.toISOString(),
        endTime: null,
        symbols: Array.isArray(row.affectedAssets) ? row.affectedAssets.map(String) : [],
        source: row.source,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return NextResponse.json<SuccessBody>({ events });
  } catch (error) {
    console.error("Failed to load events", error);
    return NextResponse.json<ErrorBody>({ error: "Failed to load events" }, { status: 500 });
  }
}
