import type { PerceptionSnapshot } from "./types";

export interface SnapshotStorePort {
  loadLatestSnapshot(params: { asOf?: Date }): Promise<PerceptionSnapshot | null>;
  storeSnapshot(snapshot: PerceptionSnapshot): Promise<void>;
}
