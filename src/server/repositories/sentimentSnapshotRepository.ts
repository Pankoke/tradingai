import { promises as fs } from "fs";
import path from "path";
import type { SentimentSnapshotV2 } from "@/src/domain/sentiment/types";
import type { WriteResult } from "@/src/domain/shared/writeResult";
import { UNKNOWN_COUNTS_NOTE } from "@/src/domain/shared/writeResult";

const ROOT_DIR = path.join(process.cwd(), "reports", "sentiment-snapshots");

async function ensureDir() {
  await fs.mkdir(ROOT_DIR, { recursive: true });
}

function buildFilename(assetId: string, asOfIso: string) {
  const safeAsset = assetId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeIso = asOfIso.replace(/[^0-9T:-]/g, "_");
  return path.join(ROOT_DIR, `${safeAsset}_${safeIso}.json`);
}

export async function upsertSentimentSnapshot(snapshot: SentimentSnapshotV2): Promise<WriteResult> {
  await ensureDir();
  const file = buildFilename(snapshot.assetId, snapshot.asOfIso);
  let exists = false;
  try {
    await fs.access(file);
    exists = true;
  } catch {
    exists = false;
  }
  await fs.writeFile(file, JSON.stringify(snapshot, null, 2), "utf8");
  return {
    inserted: exists ? 0 : 1,
    updated: exists ? 1 : 0,
    upserted: 1,
    note: exists ? "updated file snapshot" : "created file snapshot",
  };
}

export async function getLatestSentimentSnapshot(assetId: string): Promise<SentimentSnapshotV2 | null> {
  try {
    const files = await fs.readdir(ROOT_DIR);
    const matching = files.filter((f) => f.startsWith(assetId.replace(/[^a-zA-Z0-9_-]/g, "_")));
    if (!matching.length) return null;
    const sorted = matching.sort().reverse();
    const content = await fs.readFile(path.join(ROOT_DIR, sorted[0]), "utf8");
    return JSON.parse(content) as SentimentSnapshotV2;
  } catch {
    return null;
  }
}

export async function getSentimentSnapshotStats(): Promise<
  Array<{ assetId: string; latestTimestamp: string; sourceIds: string[] }>
> {
  try {
    const files = await fs.readdir(ROOT_DIR);
    const latestByAsset: Record<string, { latestIso: string; sourceIds: string[] }> = {};
    for (const file of files) {
      const full = path.join(ROOT_DIR, file);
      const content = await fs.readFile(full, "utf8");
      const snapshot = JSON.parse(content) as SentimentSnapshotV2;
      const current = latestByAsset[snapshot.assetId];
      if (!current || snapshot.asOfIso > current.latestIso) {
        latestByAsset[snapshot.assetId] = {
          latestIso: snapshot.asOfIso,
          sourceIds: snapshot.sources.map((s) => s.sourceId),
        };
      }
    }
    return Object.entries(latestByAsset).map(([assetId, v]) => ({
      assetId,
      latestTimestamp: v.latestIso,
      sourceIds: v.sourceIds,
    }));
  } catch {
    return [];
  }
}

export function unknownSentimentWriteResult(note = UNKNOWN_COUNTS_NOTE): WriteResult {
  return { inserted: null, updated: null, upserted: null, note };
}
