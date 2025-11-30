CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"display_symbol" text NOT NULL,
	"name" text NOT NULL,
	"asset_class" text NOT NULL,
	"base_currency" text,
	"quote_currency" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candles" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"timeframe" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"open" numeric NOT NULL,
	"high" numeric NOT NULL,
	"low" numeric NOT NULL,
	"close" numeric NOT NULL,
	"volume" numeric,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "candles" ADD CONSTRAINT "candles_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candles_asset_tf_ts" ON "candles" USING btree ("asset_id" DESC NULLS LAST,"timeframe" DESC NULLS LAST,"timestamp" DESC NULLS LAST);