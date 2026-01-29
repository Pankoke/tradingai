import { randomUUID } from "node:crypto";
import type { EventRepositoryPort } from "@/src/domain/events/ports";
import type { EventInsert, EventRow } from "@/src/domain/events/types";
import { getEventsInRange, insertOrUpdateEvents } from "@/src/server/repositories/eventRepository";

export class EventRepositoryAdapter implements EventRepositoryPort {
  async upsertMany(events: EventInsert[]): Promise<{ inserted: number; updated: number }> {
    if (!events.length) {
      return { inserted: 0, updated: 0 };
    }

    const payload = events.map((event) => ({
      ...event,
      id: event.id ?? randomUUID(),
    }));

    await insertOrUpdateEvents(payload);
    return { inserted: events.length, updated: 0 };
  }

  async findRelevant(params: { assetId: string; from: Date; to: Date }): Promise<EventRow[]> {
    const eventsInRange = await getEventsInRange({ from: params.from, to: params.to });
    const normalized = eventsInRange.map<EventRow>((event) => ({
      ...event,
      createdAt: event.createdAt ?? undefined,
      updatedAt: event.updatedAt ?? undefined,
    }));
    return normalized.filter((event) => {
      const affected = event.affectedAssets;
      if (!affected || (Array.isArray(affected) && affected.length === 0)) {
        return true;
      }
      if (Array.isArray(affected)) {
        return affected.includes(params.assetId);
      }
      return false;
    });
  }
}
