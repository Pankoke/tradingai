import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { assets } from "./assets";
import { perceptionSnapshots } from "./perceptionSnapshots";

export const perceptionSnapshotItems = pgTable("perception_snapshot_items", {
  id: text("id").primaryKey(),
  snapshotId: text("snapshot_id").notNull().references(() => perceptionSnapshots.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  setupId: text("setup_id").notNull(), // references future setups table
  direction: text("direction").notNull(),
  rankOverall: integer("rank_overall").notNull(),
  rankWithinAsset: integer("rank_within_asset").notNull(),
  scoreTotal: integer("score_total").notNull(),
  scoreTrend: integer("score_trend"),
  scoreMomentum: integer("score_momentum"),
  scoreVolatility: integer("score_volatility"),
  scorePattern: integer("score_pattern"),
  confidence: integer("confidence").notNull(),
  biasScore: integer("bias_score").default(50),
  biasScoreAtTime: integer("bias_score_at_time"),
  eventContext: jsonb("event_context"),
  riskReward: jsonb("risk_reward"),
  isSetupOfTheDay: boolean("is_setup_of_the_day").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
