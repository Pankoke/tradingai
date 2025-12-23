import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { assets } from "./assets";

export const candles = pgTable("candles", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id),
  timeframe: text("timeframe").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: numeric("open").notNull(),
  high: numeric("high").notNull(),
  low: numeric("low").notNull(),
  close: numeric("close").notNull(),
  volume: numeric("volume"),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  assetTimeIdx: index("candles_asset_time_idx").on(table.assetId, table.timeframe, table.timestamp),
}));

// Optional: Typen für später im Code
export type Candle = typeof candles.$inferSelect;
export type NewCandle = typeof candles.$inferInsert;
