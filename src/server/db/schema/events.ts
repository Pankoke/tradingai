import { jsonb, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  providerId: text("provider_id"),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  impact: integer("impact").notNull(),
  country: text("country"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  actualValue: text("actual_value"),
  previousValue: text("previous_value"),
  forecastValue: text("forecast_value"),
  affectedAssets: jsonb("affected_assets"),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
