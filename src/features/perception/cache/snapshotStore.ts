import { eq } from "drizzle-orm";
import { logger } from "@/src/lib/logger";
import { isMissingTableError } from "@/src/lib/utils";
import {
  getLatestSnapshot,
  listRecentSnapshots,
  insertSnapshotWithItems,
  getSnapshotWithItems,
  type PerceptionSnapshotWithItems,
  type PerceptionSnapshotInput,
  type PerceptionSnapshotItemInput,
  type PerceptionSnapshot,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import type { SetupProfile } from "@/src/lib/config/setupProfile";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { perceptionSnapshotItems } from "@/src/server/db/schema/perceptionSnapshotItems";

const SNAPSHOT_TABLE = "perception_snapshots";

export async function saveSnapshotToStore(params: {
  snapshot: PerceptionSnapshotInput;
  items: PerceptionSnapshotItemInput[];
}): Promise<void> {
  try {
    await insertSnapshotWithItems(params);
  } catch (error) {
    if (isMissingTableError(error, SNAPSHOT_TABLE)) {
      logger.warn("Snapshot table missing, skipping persistence", { table: SNAPSHOT_TABLE });
      return;
    }
    throw error;
  }
}

export async function loadLatestSnapshotFromStore(): Promise<PerceptionSnapshotWithItems | null> {
  try {
    const snapshot = await getLatestSnapshot({ excludeLabel: "intraday" });
    return snapshot ?? null;
  } catch (error) {
    if (isMissingTableError(error, SNAPSHOT_TABLE)) {
      return null;
    }
    throw error;
  }
}

export async function loadLatestSnapshotForProfile(
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
      const intraday = await getLatestSnapshot({ label: "intraday" });
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
    const fallback = await getLatestSnapshot({ excludeLabel: "intraday" });
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

export async function listSnapshotsFromStore(limit = 10): Promise<PerceptionSnapshot[]> {
  try {
    return await listRecentSnapshots(limit);
  } catch (error) {
    if (isMissingTableError(error, SNAPSHOT_TABLE)) {
      return [];
    }
    throw error;
  }
}

export async function loadSnapshotWithItems(snapshotId: string): Promise<PerceptionSnapshotWithItems | null> {
  try {
    return (await getSnapshotWithItems(snapshotId)) ?? null;
  } catch (error) {
    if (isMissingTableError(error, SNAPSHOT_TABLE)) {
      return null;
    }
    throw error;
  }
}

/**
 * Utility used in integration tests to clean up records.
 */
export async function deleteSnapshotFromStore(snapshotId: string): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(perceptionSnapshotItems).where(eq(perceptionSnapshotItems.snapshotId, snapshotId));
      await tx.delete(perceptionSnapshots).where(eq(perceptionSnapshots.id, snapshotId));
    });
  } catch (error) {
    if (isMissingTableError(error, SNAPSHOT_TABLE)) {
      return;
    }
    throw error;
  }
}
