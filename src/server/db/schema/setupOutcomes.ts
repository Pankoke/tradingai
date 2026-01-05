import { pgTable, text, timestamp, integer, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const setupOutcomes = pgTable(
  "setup_outcomes",
  {
    id: text("id").primaryKey(),
    setupId: text("setup_id").notNull(),
    snapshotId: text("snapshot_id").notNull(),
    assetId: text("asset_id").notNull(),
    profile: text("profile").notNull(),
    timeframe: text("timeframe").notNull(),
    direction: text("direction").notNull(),
    playbookId: text("playbook_id"),
    setupGrade: text("setup_grade"),
    setupType: text("setup_type"),
    gradeRationale: jsonb("grade_rationale").$type<string[] | null>(),
    noTradeReason: text("no_trade_reason"),
    gradeDebugReason: text("grade_debug_reason"),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull(),
    windowBars: integer("window_bars").default(10),
    outcomeStatus: text("outcome_status").notNull(),
    outcomeAt: timestamp("outcome_at", { withTimezone: true }),
    barsToOutcome: integer("bars_to_outcome"),
    reason: text("reason"),
    setupEngineVersion: text("setup_engine_version"),
    evaluationTimeframe: text("evaluation_timeframe"),
  },
  (table) => ({
    setupSnapshotUnique: uniqueIndex("setup_outcomes_snapshot_setup_idx").on(table.snapshotId, table.setupId),
    assetEvaluatedIdx: index("setup_outcomes_asset_eval_idx").on(table.assetId, table.evaluatedAt),
    gradeOutcomeIdx: index("setup_outcomes_grade_outcome_idx").on(table.setupGrade, table.outcomeStatus),
  }),
);
