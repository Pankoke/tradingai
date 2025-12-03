import type { Timeframe } from "./marketDataProvider";
import {
  getBiasSnapshot,
  getBiasSnapshotsForRange,
  type BiasSnapshot as BiasSnapshotRow,
} from "@/src/server/repositories/biasRepository";

export type BiasDomainModel = {
  assetId: string;
  date: Date;
  timeframe: Timeframe;
  biasScore: number;
  confidence: number;
  trendScore?: number;
  volatilityScore?: number;
  rangeScore?: number;
};

function mapRow(row: BiasSnapshotRow): BiasDomainModel {
  return {
    assetId: row.assetId,
    date: new Date(`${row.date}T00:00:00Z`),
    timeframe: row.timeframe as Timeframe,
    biasScore: row.biasScore,
    confidence: row.confidence,
    trendScore: row.trendScore ?? undefined,
    volatilityScore: row.volatilityScore ?? undefined,
    rangeScore: row.rangeScore ?? undefined,
  };
}

export interface BiasProvider {
  getBiasSnapshot(params: {
    assetId: string;
    date: Date;
    timeframe: Timeframe;
  }): Promise<BiasDomainModel | null>;
  getBiasForDateRange(params: {
    assetId: string;
    from: Date;
    to: Date;
    timeframe: Timeframe;
  }): Promise<BiasDomainModel[]>;
}

export class DbBiasProvider implements BiasProvider {
  async getBiasSnapshot(params: {
    assetId: string;
    date: Date;
    timeframe: Timeframe;
  }): Promise<BiasDomainModel | null> {
    const row = await getBiasSnapshot({
      assetId: params.assetId,
      date: params.date,
      timeframe: params.timeframe,
    });

    if (process.env.DEBUG_BIAS === "1") {
      console.log("[BiasProvider:getBiasSnapshot]", {
        assetId: params.assetId,
        timeframe: params.timeframe,
        date: params.date.toISOString().slice(0, 10),
        row: row
          ? {
              biasScore: row.biasScore,
              confidence: row.confidence,
              trendScore: row.trendScore,
            }
          : null,
      });
    }

    if (row) {
      return mapRow(row);
    }

    const fallbackFrom = new Date(params.date);
    fallbackFrom.setDate(fallbackFrom.getDate() - 30);
    const rows = await getBiasSnapshotsForRange({
      assetId: params.assetId,
      from: fallbackFrom,
      to: params.date,
      timeframe: params.timeframe,
    });
    if (!rows || rows.length === 0) {
      return null;
    }

    if (process.env.DEBUG_BIAS === "1") {
      console.log("[BiasProvider:getBiasSnapshot:fallback]", {
        assetId: params.assetId,
        timeframe: params.timeframe,
        fallbackFrom: fallbackFrom.toISOString().slice(0, 10),
        date: params.date.toISOString().slice(0, 10),
        rows: rows.map((r) => ({
          biasScore: r.biasScore,
          confidence: r.confidence,
          date: r.date,
        })),
      });
    }

    return mapRow(rows[0]);
  }

  async getBiasForDateRange(params: {
    assetId: string;
    from: Date;
    to: Date;
    timeframe: Timeframe;
  }): Promise<BiasDomainModel[]> {
    const rows = await getBiasSnapshotsForRange({
      assetId: params.assetId,
      from: params.from,
      to: params.to,
      timeframe: params.timeframe,
    });

    return rows.map(mapRow);
  }
}
