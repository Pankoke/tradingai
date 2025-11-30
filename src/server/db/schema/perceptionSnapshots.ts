import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const perceptionSnapshots = pgTable("perception_snapshots", {
  id: text("id").primaryKey(),
  snapshotTime: timestamp("snapshot_time").notNull(),
  label: text("label"),
  version: text("version").notNull(),
  dataMode: text("data_mode").notNull(),
  generatedMs: integer("generated_ms"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
