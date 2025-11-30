import { db } from "./db";
import { assets } from "./schema/assets";
import { biasAssetDateTimeframe, biasSnapshots } from "./schema/biasSnapshots";
import { candles, candlesUnique } from "./schema/candles";
import { events } from "./schema/events";
import { perceptionSnapshotItems, snapshotAssetIndex, snapshotRankIndex } from "./schema/perceptionSnapshotItems";
import { perceptionSnapshots, snapshotTimeIndex } from "./schema/perceptionSnapshots";

export { db };
export { assets };
export { biasSnapshots };
export { biasAssetDateTimeframe };
export { candles };
export { candlesUnique };
export { events };
export { perceptionSnapshotItems };
export { snapshotAssetIndex };
export { snapshotRankIndex };
export { perceptionSnapshots };
export { snapshotTimeIndex };

export const tables = {
  assets,
  biasSnapshots,
  candles,
  events,
  perceptionSnapshots,
  perceptionSnapshotItems
};

export type Tables = typeof tables;
export type TableName = keyof Tables;
