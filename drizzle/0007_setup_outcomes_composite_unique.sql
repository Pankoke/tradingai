ALTER TABLE setup_outcomes DROP CONSTRAINT IF EXISTS setup_outcomes_setup_id_idx;
DROP INDEX IF EXISTS setup_outcomes_setup_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS setup_outcomes_snapshot_setup_idx ON setup_outcomes (snapshot_id, setup_id);
