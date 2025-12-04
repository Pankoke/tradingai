ALTER TABLE perception_snapshot_items
ADD COLUMN IF NOT EXISTS ring_ai_summary JSONB;
