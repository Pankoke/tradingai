import type { SnapshotStorePort } from "@/src/domain/strategy/ports";
import type { PerceptionSnapshot } from "@/src/domain/strategy/types";
import { loadLatestSnapshotFromStore, saveSnapshotToStore } from "@/src/features/perception/cache/snapshotStore";
import type {
  PerceptionSnapshotInput,
  PerceptionSnapshotItemInput,
} from "@/src/server/repositories/perceptionSnapshotRepository";

export class SnapshotStoreAdapter implements SnapshotStorePort {
  async loadLatestSnapshot(params: { asOf?: Date }): Promise<PerceptionSnapshot | null> {
    const snapshot = await loadLatestSnapshotFromStore();
    if (!snapshot) return null;
    if (params.asOf && snapshot.snapshot.snapshotTime > params.asOf) {
      return null;
    }
    return snapshot;
  }

  async storeSnapshot(snapshot: PerceptionSnapshot): Promise<void> {
    await saveSnapshotToStore({
      snapshot: snapshot.snapshot as PerceptionSnapshotInput,
      items: snapshot.items as PerceptionSnapshotItemInput[],
    });
  }
}
