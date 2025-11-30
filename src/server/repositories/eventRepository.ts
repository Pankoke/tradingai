import { and, desc, gte, lte } from "drizzle-orm";
import { db } from "../db/db";
import { events } from "../db/schema/events";
import { excluded } from "../db/sqlHelpers";

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
