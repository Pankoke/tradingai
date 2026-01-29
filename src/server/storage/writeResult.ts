import type { WriteResult } from "@/src/domain/shared/writeResult";
import { UNKNOWN_COUNTS_NOTE } from "@/src/domain/shared/writeResult";

export function unknownWriteResult(note = UNKNOWN_COUNTS_NOTE): WriteResult {
  return { inserted: null, updated: null, upserted: null, note };
}

export function fromCounts(counts: { inserted?: number; updated?: number } | null | undefined): WriteResult {
  if (!counts) {
    return unknownWriteResult();
  }
  const inserted = counts.inserted ?? 0;
  const updated = counts.updated ?? 0;
  return { inserted, updated, upserted: inserted + updated };
}
