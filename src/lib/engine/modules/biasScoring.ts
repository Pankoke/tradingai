import type { Setup } from "@/src/lib/engine/types";

export type BiasScoreResult = {
  biasScore: number;
};

function hashSymbolTimeframe(setup: Setup): number {
  const key = `${setup.symbol}-${setup.timeframe}`;
  return key.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function applyBiasScoring(setup: Setup): BiasScoreResult {
  const hash = hashSymbolTimeframe(setup);
  const offset = hash % 10;
  const baseLong = 55 + offset; // 55–64
  const baseShort = 40 + offset; // 40–49
  const score = setup.direction === "Long" ? baseLong + 26 : baseShort + 31; // push into ~81-90 or ~71-80
  return { biasScore: Math.min(100, Math.max(0, score)) };
}
