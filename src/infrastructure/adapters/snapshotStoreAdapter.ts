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
    return {
      snapshot: {
        ...snapshot.snapshot,
        setups: (snapshot.snapshot.setups ?? []) as PerceptionSnapshot["snapshot"]["setups"],
      },
      items: snapshot.items as PerceptionSnapshot["items"],
      setups: snapshot.setups as PerceptionSnapshot["setups"],
    };
  }

  async storeSnapshot(snapshot: PerceptionSnapshot): Promise<void> {
    const snapshotInput = snapshot.snapshot as unknown as PerceptionSnapshotInput;
    const itemInputs = snapshot.items as unknown as PerceptionSnapshotItemInput[];
    await saveSnapshotToStore({ snapshot: snapshotInput, items: itemInputs });
  }
}
