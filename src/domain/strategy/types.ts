import type { Setup } from "@/src/lib/engine/types";

export type PerceptionSnapshotRecord = {
  id: string;
  snapshotTime: Date;
  label?: string | null;
  version?: string | null;
  dataMode?: string | null;
  generatedMs?: number | null;
  notes?: string | null;
  setups?: Setup[];
};

export type PerceptionSnapshotItemRecord = {
  snapshotId: string;
  symbol?: string | null;
  rankOverall?: number | null;
  [key: string]: unknown;
};

export type PerceptionSnapshot = {
  snapshot: PerceptionSnapshotRecord;
  items: PerceptionSnapshotItemRecord[];
  setups: Setup[];
};
