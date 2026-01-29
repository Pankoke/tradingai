import type { EventInsert, EventRow } from "./types";

export interface EventRepositoryPort {
  upsertMany(events: EventInsert[]): Promise<{ inserted: number; updated: number }>;
  findRelevant(params: { assetId: string; from: Date; to: Date }): Promise<EventRow[]>;
}
