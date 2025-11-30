import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  displaySymbol: text("display_symbol").notNull(),
  name: text("name").notNull(),
  assetClass: text("asset_class").notNull(),
  baseCurrency: text("base_currency"),
  quoteCurrency: text("quote_currency"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
