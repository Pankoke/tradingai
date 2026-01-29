import type { EventInsert, EventRow } from "./types";
import type { WriteResult } from "@/src/domain/shared/writeResult";

export interface EventRepositoryPort {
  upsertMany(events: EventInsert[]): Promise<WriteResult>;
  findRelevant(params: { assetId: string; from: Date; to: Date }): Promise<EventRow[]>;
}
