import type { candles } from "@/src/server/db/schema/candles";
import type { CandleDomainModel, Timeframe } from "@/src/server/providers/marketDataProvider";

export type CandleTimeframe = Timeframe;

export type CandleRow = typeof candles.$inferSelect;

export type CandleInsert = Omit<typeof candles.$inferInsert, "id"> & { id?: string };

export type NormalizedCandle = CandleDomainModel;
