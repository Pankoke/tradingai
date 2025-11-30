import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

type IndexColumn = {
  defaultConfig?: {
    order?: "asc" | "desc";
    nulls?: "first" | "last";
    opClass?: string;
  };
};

const ensureIndexDefaults = (column: IndexColumn) => {
  if (column.defaultConfig) return;
  column.defaultConfig = {
    order: "asc",
    nulls: "last",
    opClass: undefined
  };
};

export const perceptionSnapshots = pgTable("perception_snapshots", {
  id: text("id").primaryKey(),
  snapshotTime: timestamp("snapshot_time").notNull(),
  label: text("label"),
  version: text("version").notNull(),
  dataMode: text("data_mode").notNull(),
  generatedMs: integer("generated_ms"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
}, () => ({
  snapshotTimeIndex
}));

ensureIndexDefaults(perceptionSnapshots.snapshotTime);

export const snapshotTimeIndex = index("snapshot_time_idx")
  .on(perceptionSnapshots.snapshotTime);
