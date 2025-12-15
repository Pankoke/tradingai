import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const auditRuns = pgTable(
  "audit_runs",
  {
    id: text("id").primaryKey(),
    action: text("action").notNull(),
    source: text("source").notNull(),
    ok: boolean("ok").notNull().default(true),
    durationMs: integer("duration_ms"),
    message: text("message"),
    error: text("error"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    actionIdx: index("audit_runs_action_idx").on(table.action),
    sourceIdx: index("audit_runs_source_idx").on(table.source),
    createdIdx: index("audit_runs_created_idx").on(table.createdAt),
  }),
);
