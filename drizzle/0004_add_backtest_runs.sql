CREATE TABLE "backtest_runs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_key" text NOT NULL,
	"asset_id" text NOT NULL,
	"from_iso" text NOT NULL,
	"to_iso" text NOT NULL,
	"step_hours" integer NOT NULL,
	"costs_config" jsonb,
	"exit_policy" jsonb,
	"kpis" jsonb,
	"report_path" text,
	"trades" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "backtest_runs_run_key_idx" ON "backtest_runs" USING btree ("run_key");--> statement-breakpoint
CREATE INDEX "backtest_runs_created_idx" ON "backtest_runs" USING btree ("created_at");--> statement-breakpoint
