export type WriteResult = {
  inserted: number | null;
  updated: number | null;
  upserted: number | null;
  note?: string;
};

export const UNKNOWN_COUNTS_NOTE = "counts unknown";
