import { randomUUID } from "node:crypto";
import { and, desc, gte, lte, eq, sql, or, isNull } from "drizzle-orm";
import { db } from "../db/db";
import { events } from "../db/schema/events";
import { excluded } from "../db/sqlHelpers";
import type { MarketScopeEnum } from "@/src/server/events/eventDescription";

export type Event = typeof events["$inferSelect"];
export type EventInput = typeof events["$inferInsert"];

export async function getEventsInRange(
  params: {
    from: Date;
    to: Date;
  },
  filters?: { category?: string; impact?: number },
): Promise<Event[]> {
  if (params.from > params.to) {
    throw new Error("`from` must be before `to`");
  }

  const conditions = [
    gte(events.scheduledAt, params.from),
    lte(events.scheduledAt, params.to),
  ];

  if (filters?.category) {
    conditions.push(eq(events.category, filters.category));
  }
  if (filters?.impact) {
    conditions.push(eq(events.impact, filters.impact));
  }

  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.scheduledAt));
}

export async function insertOrUpdateEvents(eventInputs: EventInput[]): Promise<void> {
  if (!eventInputs.length) {
    return;
  }

  const payload = eventInputs.map((input) => ({
    ...input,
    updatedAt: new Date()
  }));

  await db
    .insert(events)
    .values(payload)
    .onConflictDoUpdate({
      target: events.id,
      set: {
        providerId: excluded(events.providerId.name),
        title: excluded(events.title.name),
        description: excluded(events.description.name),
        category: excluded(events.category.name),
        impact: excluded(events.impact.name),
        country: excluded(events.country.name),
        scheduledAt: excluded(events.scheduledAt.name),
        actualValue: excluded(events.actualValue.name),
        previousValue: excluded(events.previousValue.name),
        forecastValue: excluded(events.forecastValue.name),
        affectedAssets: excluded(events.affectedAssets.name),
        source: excluded(events.source.name),
        updatedAt: excluded(events.updatedAt.name)
      }
    });
}

export async function listRecentEvents(limit = 100): Promise<Event[]> {
  return db.select().from(events).orderBy(desc(events.scheduledAt)).limit(limit);
}

export async function listEventsForEnrichment(params: {
  from: Date;
  to: Date;
  limit: number;
}): Promise<Event[]> {
  const limit = Math.min(Math.max(params.limit, 1), 50);
  return db
    .select()
    .from(events)
    .where(
      and(
        gte(events.scheduledAt, params.from),
        lte(events.scheduledAt, params.to),
        or(isNull(events.summary), isNull(events.enrichedAt)),
      ),
    )
    .orderBy(events.scheduledAt)
    .limit(limit);
}

export async function getEventById(id: string): Promise<Event | undefined> {
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return event;
}

export async function createEvent(input: Omit<EventInput, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Event> {
  const id = input.id ?? randomUUID();
  const [created] = await db
    .insert(events)
    .values({
      ...input,
      id,
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateEvent(id: string, updates: Partial<Omit<EventInput, "id">>): Promise<Event | undefined> {
  const [updated] = await db
    .update(events)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id))
    .returning();
  return updated;
}

export async function deleteEvent(id: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}

type EventEnrichmentPayload = {
  summary: string;
  marketScope: MarketScopeEnum;
  expectationLabel: "above" | "inline" | "below" | "unknown";
  expectationConfidence: number | null;
  expectationNote: string;
  enrichedAt: Date;
};

export async function updateEventEnrichment(id: string, payload: EventEnrichmentPayload): Promise<void> {
  await db
    .update(events)
    .set({
      summary: payload.summary,
      marketScope: payload.marketScope,
      expectationLabel: payload.expectationLabel,
      expectationConfidence: payload.expectationConfidence,
      expectationNote: payload.expectationNote,
      enrichedAt: payload.enrichedAt,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
}

export async function countAllEvents(): Promise<number> {
  const [result] = await db.select({ value: sql<number>`count(*)` }).from(events);
  return result?.value ?? 0;
}

export async function countUpcomingEvents(daysAhead = 7): Promise<number> {
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const [result] = await db
    .select({ value: sql<number>`count(*)` })
    .from(events)
    .where(and(gte(events.scheduledAt, now), lte(events.scheduledAt, future)));
  return result?.value ?? 0;
}

export async function listHighImpactUpcomingEvents({
  impactThreshold = 3,
  daysAhead = 7,
  limit = 3,
}: {
  impactThreshold?: number;
  daysAhead?: number;
  limit?: number;
} = {}): Promise<Event[]> {
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(events)
    .where(
      and(
        gte(events.scheduledAt, now),
        lte(events.scheduledAt, future),
        gte(events.impact, impactThreshold),
      ),
    )
    .orderBy(events.scheduledAt)
    .limit(limit);
}
