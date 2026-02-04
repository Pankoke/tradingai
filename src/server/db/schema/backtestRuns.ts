import { randomUUID } from "node:crypto";
import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const backtestRuns = pgTable(
  "backtest_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    runKey: text("run_key").notNull(),
    assetId: text("asset_id").notNull(),
    fromIso: text("from_iso").notNull(),
    toIso: text("to_iso").notNull(),
    stepHours: integer("step_hours").notNull(),
    costsConfig: jsonb("costs_config"),
    exitPolicy: jsonb("exit_policy"),
    kpis: jsonb("kpis"),
    reportPath: text("report_path"),
    trades: jsonb("trades"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runKeyUnique: uniqueIndex("backtest_runs_run_key_idx").on(table.runKey),
    createdIdx: index("backtest_runs_created_idx").on(table.createdAt),
  }),
);
