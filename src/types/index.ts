import { setupSchema, perceptionSnapshotSchema } from "@/src/lib/engine/types";
import { biasSnapshotSchema, eventSchema } from "@/src/lib/engine/eventsBiasTypes";
import type { z } from "zod";

export type Setup = z.infer<typeof setupSchema>;
export type BiasSnapshot = z.infer<typeof biasSnapshotSchema>;
export type EventItem = z.infer<typeof eventSchema>;
export type PerceptionSnapshot = z.infer<typeof perceptionSnapshotSchema>;

export const enum UserRole {
  Free = "free",
  Premium = "premium",
}
