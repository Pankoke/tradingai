import { logger } from "@/src/lib/logger";
import { isMissingTableError } from "@/src/lib/utils";
import type { PerceptionSnapshotStorePort } from "@/src/domain/perception/ports";
import type { SetupProfile } from "@/src/lib/config/setupProfile";
import type { PerceptionSnapshotWithItems, PerceptionSnapshot } from "@/src/domain/perception/types";

const SNAPSHOT_TABLE = "perception_snapshots";

export type SnapshotStore = ReturnType<typeof createSnapshotStore>;

export function createSnapshotStore(port: PerceptionSnapshotStorePort) {
  async function saveSnapshotToStore(params: Parameters<PerceptionSnapshotStorePort["insertSnapshotWithItems"]>[0]): Promise<void> {
    try {
      await port.insertSnapshotWithItems(params);
    } catch (error) {
      if (isMissingTableError(error, SNAPSHOT_TABLE)) {
        logger.warn("Snapshot table missing, skipping persistence", { table: SNAPSHOT_TABLE });
        return;
      }
      throw error;
    }
  }

  async function loadLatestSnapshotFromStore(): Promise<PerceptionSnapshotWithItems | null> {
    try {
      const snapshot = await port.getLatestSnapshot({ excludeLabel: "intraday" });
      return snapshot ?? null;
    } catch (error) {
      if (isMissingTableError(error, SNAPSHOT_TABLE)) {
        return null;
      }
      throw error;
    }
  }

  async function loadLatestSnapshotForProfile(
    requestedProfile?: SetupProfile | string | null,
  ): Promise<{
    snapshot: PerceptionSnapshotWithItems | null;
    fulfilledLabel: string | null;
    requestedProfile: string | null;
    requestedAvailable: boolean;
    fallbackUsed: boolean;
  }> {
    const normalized = requestedProfile ? requestedProfile.toString().toLowerCase() : null;
    const wantsIntraday = normalized === "intraday";

    try {
      if (wantsIntraday) {
        const intraday = await port.getLatestSnapshot({ label: "intraday" });
        if (intraday) {
          return {
            snapshot: intraday,
            fulfilledLabel: intraday.snapshot.label ?? "intraday",
            requestedProfile: normalized,
            requestedAvailable: true,
            fallbackUsed: false,
          };
        }
      }
      const fallback = await port.getLatestSnapshot({ excludeLabel: "intraday" });
      return {
        snapshot: fallback ?? null,
        fulfilledLabel: fallback?.snapshot.label ?? null,
        requestedProfile: normalized,
        requestedAvailable: !wantsIntraday,
        fallbackUsed: wantsIntraday && Boolean(fallback),
      };
    } catch (error) {
      if (isMissingTableError(error, SNAPSHOT_TABLE)) {
        return {
          snapshot: null,
          fulfilledLabel: null,
          requestedProfile: normalized,
          requestedAvailable: false,
          fallbackUsed: false,
        };
      }
      throw error;
    }
  }

  async function listSnapshotsFromStore(limit = 10): Promise<PerceptionSnapshot[]> {
    try {
      return await port.listRecentSnapshots(limit);
    } catch (error) {
      if (isMissingTableError(error, SNAPSHOT_TABLE)) {
        return [];
      }
      throw error;
    }
  }

  async function loadSnapshotWithItems(snapshotId: string): Promise<PerceptionSnapshotWithItems | null> {
    try {
      return (await port.getSnapshotWithItems(snapshotId)) ?? null;
    } catch (error) {
      if (isMissingTableError(error, SNAPSHOT_TABLE)) {
        return null;
      }
      throw error;
    }
  }

  async function deleteSnapshotFromStore(snapshotId: string): Promise<void> {
    try {
      await port.deleteSnapshot(snapshotId);
    } catch (error) {
      if (isMissingTableError(error, SNAPSHOT_TABLE)) {
        return;
      }
      throw error;
    }
  }

  async function getSnapshotByTime(params: { snapshotTime: Date }): Promise<PerceptionSnapshotWithItems | null> {
    try {
      return (await port.getSnapshotByTime(params)) ?? null;
    } catch (error) {
      if (isMissingTableError(error, SNAPSHOT_TABLE)) {
        return null;
      }
      throw error;
    }
  }

  return {
    saveSnapshotToStore,
    loadLatestSnapshotFromStore,
    loadLatestSnapshotForProfile,
    listSnapshotsFromStore,
    loadSnapshotWithItems,
    deleteSnapshotFromStore,
    getSnapshotByTime,
  };
}
