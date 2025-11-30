import { and, desc, excluded, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/db";
import { events } from "../db/schema/events";

type Event = typeof events["$inferSelect"];
type EventInput = typeof events["$inferInsert"];

export async function getEventsInRange(params: {
  from: Date;
  to: Date;
}): Promise<Event[]> {
  if (params.from > params.to) {
    throw new Error("`from` must be before `to`");
  }

  return db
    .select()
    .from(events)
    .where(
      and(
        gte(events.scheduledAt, params.from),
        lte(events.scheduledAt, params.to)
      )
    )
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
        providerId: excluded(events.providerId),
        title: excluded(events.title),
        description: excluded(events.description),
        category: excluded(events.category),
        impact: excluded(events.impact),
        country: excluded(events.country),
        scheduledAt: excluded(events.scheduledAt),
        actualValue: excluded(events.actualValue),
        previousValue: excluded(events.previousValue),
        forecastValue: excluded(events.forecastValue),
        affectedAssets: excluded(events.affectedAssets),
        source: excluded(events.source),
        updatedAt: excluded(events.updatedAt)
      }
    });
}
