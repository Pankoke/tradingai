import type { Event, BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";
import type { PerceptionSnapshot as EngineSnapshot, Setup } from "@/src/lib/engine/types";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";

export type PerceptionHistoryEntry = {
  id: string;
  createdAt: string;
  snapshot: EngineSnapshot;
  events: Event[];
  biasSnapshot: BiasSnapshot | null;
};

/**
 * @deprecated In-memory history is deprecated. This helper now reads from the database.
 */
export async function getPerceptionHistory(limit?: number): Promise<PerceptionHistoryEntry[]> {
  const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
  const snapshots = await snapshotStore.listSnapshotsFromStore(limit ?? 20);
  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    createdAt: (snapshot.createdAt ?? snapshot.snapshotTime).toISOString(),
    snapshot: mapSnapshotToEngine(snapshot, (snapshot.setups ?? []) as Setup[]),
    events: [],
    biasSnapshot: null,
  }));
}

function mapSnapshotToEngine(snapshot: { id: string; version: string | null; snapshotTime: Date | string }, setups: Setup[]): EngineSnapshot {
  return {
    generatedAt: new Date(snapshot.snapshotTime).toISOString(),
    setupOfTheDayId: setups[0]?.id ?? snapshot.id,
    setups,
    universe: [],
    version: snapshot.version ?? "unknown",
  };
}
