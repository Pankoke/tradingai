CREATE TABLE "bias_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"date" date NOT NULL,
	"timeframe" text NOT NULL,
	"bias_score" integer NOT NULL,
	"confidence" integer NOT NULL,
	"trend_score" integer,
	"volatility_score" integer,
	"range_score" integer,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"impact" integer NOT NULL,
	"country" text,
	"scheduled_at" timestamp NOT NULL,
	"actual_value" text,
	"previous_value" text,
	"forecast_value" text,
	"affected_assets" jsonb,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "perception_snapshot_items" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"setup_id" text NOT NULL,
	"direction" text NOT NULL,
	"rank_overall" integer NOT NULL,
	"rank_within_asset" integer NOT NULL,
	"score_total" integer NOT NULL,
	"score_trend" integer,
	"score_momentum" integer,
	"score_volatility" integer,
	"score_pattern" integer,
	"confidence" integer NOT NULL,
	"bias_score_at_time" integer,
	"event_context" jsonb,
	"is_setup_of_the_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "perception_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_time" timestamp NOT NULL,
	"label" text,
	"version" text NOT NULL,
	"data_mode" text NOT NULL,
	"generated_ms" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bias_snapshots" ADD CONSTRAINT "bias_snapshots_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perception_snapshot_items" ADD CONSTRAINT "perception_snapshot_items_snapshot_id_perception_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."perception_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perception_snapshot_items" ADD CONSTRAINT "perception_snapshot_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "bias_asset_date_tf" ON "bias_snapshots" USING btree ("asset_id" DESC NULLS LAST,"date" DESC NULLS LAST,"timeframe" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "items_snapshot_rank_idx" ON "perception_snapshot_items" USING btree ("snapshot_id" DESC NULLS LAST,"rank_overall" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "items_snapshot_asset_idx" ON "perception_snapshot_items" USING btree ("snapshot_id","asset_id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "snapshot_time_idx" ON "perception_snapshots" USING btree ("snapshot_time" DESC NULLS LAST);
