import { db } from "./db";
import { assets } from "./schema/assets";
import { biasSnapshots } from "./schema/biasSnapshots";
import { candles } from "./schema/candles";
import { events } from "./schema/events";
import { perceptionSnapshotItems } from "./schema/perceptionSnapshotItems";
import { perceptionSnapshots } from "./schema/perceptionSnapshots";

export { db };
export { assets };
export { biasSnapshots };
export { candles };
export { events };
export { perceptionSnapshotItems };
export { perceptionSnapshots };

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
