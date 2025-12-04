import { biasSnapshotSchema, biasDirectionEnum, type BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";

const now = new Date().toISOString();

const rawBiasSnapshot: BiasSnapshot = {
  generatedAt: now,
  universe: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
  entries: [
    {
      symbol: "BTCUSDT",
      timeframe: "D1",
      direction: biasDirectionEnum.enum.Bullish,
      confidence: 78,
      biasScore: 80,
      comment: "Higher lows intact, spot demand steady, funding neutral to positive.",
    },
    {
      symbol: "ETHUSDT",
      timeframe: "H4",
      direction: biasDirectionEnum.enum.Neutral,
      confidence: 62,
      biasScore: 0,
      comment: "Range-bound; watch for break above local resistance on volume.",
    },
    {
      symbol: "SOLUSDT",
      timeframe: "H1",
      direction: biasDirectionEnum.enum.Bearish,
      confidence: 48,
      biasScore: -35,
      comment: "Pullback after strong rally; liquidity pockets below remain untested.",
    },
  ],
  version: "0.1.0",
};

export const mockBiasSnapshot: BiasSnapshot = biasSnapshotSchema.parse(rawBiasSnapshot);
