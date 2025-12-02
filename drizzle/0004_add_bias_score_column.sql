ALTER TABLE perception_snapshot_items
ADD COLUMN IF NOT EXISTS bias_score INTEGER NOT NULL DEFAULT 50;

UPDATE perception_snapshot_items
SET bias_score = 50
WHERE bias_score IS NULL;
