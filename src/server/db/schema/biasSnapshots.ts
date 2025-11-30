import { date, jsonb, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { assets } from "./assets";

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

export const biasSnapshots = pgTable("bias_snapshots", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => assets.id),
  date: date("date").notNull(),
  timeframe: text("timeframe").notNull(),
  biasScore: integer("bias_score").notNull(),
  confidence: integer("confidence").notNull(),
  trendScore: integer("trend_score"),
  volatilityScore: integer("volatility_score"),
  rangeScore: integer("range_score"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow()
}, () => ({
  biasAssetDateTimeframe
}));

ensureIndexDefaults(biasSnapshots.assetId);
ensureIndexDefaults(biasSnapshots.date);
ensureIndexDefaults(biasSnapshots.timeframe);

export const biasAssetDateTimeframe = uniqueIndex("bias_asset_date_tf")
  .on(biasSnapshots.assetId, biasSnapshots.date, biasSnapshots.timeframe);
