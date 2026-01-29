import type { events } from "@/src/server/db/schema/events";

export type EventRow = typeof events.$inferSelect;
export type EventInsert = typeof events.$inferInsert;
