import type { PerceptionSnapshotWithItems, PerceptionSnapshotInput, PerceptionSnapshotItemInput, PerceptionSnapshot } from "@/src/domain/perception/types";

export type SnapshotFilters = {
  label?: string;
  excludeLabel?: string;
  dataMode?: string;
  from?: Date;
  to?: Date;
};

export interface PerceptionSnapshotStorePort {
  insertSnapshotWithItems(params: { snapshot: PerceptionSnapshotInput; items: PerceptionSnapshotItemInput[] }): Promise<void>;
  getLatestSnapshot(filters?: SnapshotFilters): Promise<PerceptionSnapshotWithItems | null>;
  listRecentSnapshots(limit: number): Promise<PerceptionSnapshot[]>;
  getSnapshotWithItems(id: string): Promise<PerceptionSnapshotWithItems | null>;
  getSnapshotByTime(params: { snapshotTime: Date }): Promise<PerceptionSnapshotWithItems | null>;
  deleteSnapshot(id: string): Promise<void>;
}
