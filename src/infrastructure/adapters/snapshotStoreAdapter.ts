import type { SnapshotStorePort } from "@/src/domain/strategy/ports";
import type { PerceptionSnapshot } from "@/src/domain/strategy/types";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";
import type { PerceptionSnapshotInput, PerceptionSnapshotItemInput } from "@/src/domain/perception/types";

export class SnapshotStoreAdapter implements SnapshotStorePort {
  private readonly store = createSnapshotStore(perceptionSnapshotStoreAdapter);

  async loadLatestSnapshot(params: { asOf?: Date }): Promise<PerceptionSnapshot | null> {
    const snapshot = await this.store.loadLatestSnapshotFromStore();
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
    await this.store.saveSnapshotToStore({ snapshot: snapshotInput, items: itemInputs });
  }
}
