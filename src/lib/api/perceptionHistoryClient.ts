import { z } from "zod";
import type { PerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";
import { fetcher } from "@/src/lib/fetcher";
import { perceptionSnapshotSchema } from "@/src/lib/engine/types";
import { eventSchema, biasSnapshotSchema } from "@/src/lib/engine/eventsBiasTypes";

const perceptionHistoryEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  snapshot: perceptionSnapshotSchema,
  events: eventSchema.array(),
  biasSnapshot: biasSnapshotSchema.nullable(),
});

export async function fetchPerceptionHistory(limit?: number): Promise<PerceptionHistoryEntry[]> {
  const search = limit && limit > 0 ? `?limit=${limit}` : "";
  const schema = perceptionHistoryEntrySchema.array();
  return fetcher(`/api/perception/history${search}`, schema);
}
