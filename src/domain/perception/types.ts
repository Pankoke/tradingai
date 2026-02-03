import type { Setup } from "@/src/lib/engine/types";

export type PerceptionSnapshotInput = {
  id: string;
  snapshotTime: Date;
  label?: string | null;
  version?: string | null;
  dataMode?: string | null;
  generatedMs?: number | null;
  notes?: string | null;
  setups?: Setup[] | null;
  createdAt?: Date | null;
};

export type PerceptionSnapshot = {
  id: string;
  snapshotTime: Date;
  label: string | null;
  version: string | null;
  dataMode: string | null;
  generatedMs: number | null;
  notes: string | null;
  setups: Setup[] | null;
  createdAt: Date | null;
};

export type PerceptionSnapshotItemInput = {
  snapshotId: string;
  rankOverall?: number | null;
  [key: string]: unknown;
};

export type PerceptionSnapshotItem = {
  snapshotId: string;
  rankOverall: number | null;
  [key: string]: unknown;
};

export type PerceptionSnapshotWithItems = {
  snapshot: PerceptionSnapshot;
  items: PerceptionSnapshotItem[];
  setups: Setup[];
};
