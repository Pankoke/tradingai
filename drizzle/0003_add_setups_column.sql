ALTER TABLE "perception_snapshots"
  ADD COLUMN IF NOT EXISTS "setups" jsonb;
