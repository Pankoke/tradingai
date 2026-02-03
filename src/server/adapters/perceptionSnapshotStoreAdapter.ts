import {
  getLatestSnapshot,
  listRecentSnapshots,
  insertSnapshotWithItems,
  getSnapshotWithItems,
  getSnapshotByTime,
  deleteSnapshotById,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import type { PerceptionSnapshotStorePort, SnapshotFilters } from "@/src/domain/perception/ports";
import type {
  PerceptionSnapshotWithItems,
  PerceptionSnapshotInput,
  PerceptionSnapshotItemInput,
  PerceptionSnapshot,
} from "@/src/domain/perception/types";

function mapSnapshot(
  snapshot?: Awaited<ReturnType<typeof getLatestSnapshot>>,
): PerceptionSnapshotWithItems | null {
  if (!snapshot) return null;
  return snapshot as unknown as PerceptionSnapshotWithItems;
}

export const perceptionSnapshotStoreAdapter: PerceptionSnapshotStorePort = {
  async insertSnapshotWithItems(params: { snapshot: PerceptionSnapshotInput; items: PerceptionSnapshotItemInput[] }) {
    await insertSnapshotWithItems(params as never);
  },
  async getLatestSnapshot(filters?: SnapshotFilters): Promise<PerceptionSnapshotWithItems | null> {
    const result = await getLatestSnapshot(filters as never);
    return mapSnapshot(result);
  },
  async listRecentSnapshots(limit: number): Promise<PerceptionSnapshot[]> {
    const result = await listRecentSnapshots(limit);
    return result as unknown as PerceptionSnapshot[];
  },
  async getSnapshotWithItems(id: string): Promise<PerceptionSnapshotWithItems | null> {
    const result = await getSnapshotWithItems(id);
    return mapSnapshot(result ?? undefined);
  },
  async getSnapshotByTime(params: { snapshotTime: Date }): Promise<PerceptionSnapshotWithItems | null> {
    const result = await getSnapshotByTime(params);
    return mapSnapshot(result ?? undefined);
  },
  async deleteSnapshot(id: string): Promise<void> {
    await deleteSnapshotById(id);
  },
};
