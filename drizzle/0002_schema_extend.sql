ALTER TABLE "perception_snapshot_items"
  ADD COLUMN IF NOT EXISTS "risk_reward" jsonb;

