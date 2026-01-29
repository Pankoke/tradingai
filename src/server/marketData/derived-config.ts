import type { CandleTimeframe } from "@/src/domain/market-data/types";

export type DerivedPair = {
  source: CandleTimeframe;
  target: CandleTimeframe;
  lookbackCount: number;
};

export const DERIVED_PAIRS: DerivedPair[] = [
  {
    source: "1H",
    target: "4H",
    lookbackCount: 36,
  },
];

export function findDerivedPair(target: CandleTimeframe): DerivedPair | undefined {
  return DERIVED_PAIRS.find((pair) => pair.target === target);
}
