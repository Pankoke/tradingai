"use client";

import { describe, it, expect } from "vitest";
import type { Setup } from "@/src/lib/engine/types";
import { classifyTradeSignal } from "@/src/components/perception/PrimaryTradeSignal";
import { createDefaultRings } from "@/src/lib/engine/rings";

type ScoreSet = {
  trendScore: number;
  biasScore: number;
  sentimentScore: number;
  orderflowScore: number;
  eventScore: number;
  confidenceScore: number;
};

type RiskSet = {
  rrr: number | null;
  riskPercent: number | null;
  rewardPercent?: number | null;
  volatilityLabel?: "low" | "medium" | "high" | null;
};

type TestCase = {
  name: string;
  direction: "Long" | "Short";
  rings: ScoreSet;
  riskReward: RiskSet;
  expected: ReturnType<typeof classifyTradeSignal>;
};

const baseRingState = (() => {
  const rings = createDefaultRings();
  rings.confidenceScore = 60;
  rings.confidence = 60;
  return rings;
})();

const baseSetup: Setup = {
  id: "setup-test",
  assetId: "asset",
  symbol: "TEST",
  timeframe: "1D",
  direction: "Long",
  confidence: 60,
  snapshotId: null,
  snapshotCreatedAt: null,
  eventScore: 50,
  biasScore: 50,
  sentimentScore: 50,
  balanceScore: 50,
  entryZone: null,
  stopLoss: null,
  takeProfit: null,
  category: "default",
  levelDebug: undefined,
  type: "Regelbasiert",
  accessLevel: "free",
  rings: baseRingState,
  riskReward: {
    riskPercent: 1,
    rewardPercent: 3,
    rrr: 2.5,
    volatilityLabel: "medium",
  },
  ringAiSummary: null,
  eventContext: undefined,
};

function buildSetup(overrides: Partial<Setup> & { rings?: Partial<Setup["rings"]>; riskReward?: Partial<Setup["riskReward"]> } = {}): Setup {
  const rings = {
    ...baseSetup.rings,
    ...(overrides.rings ?? {}),
  };
  rings.meta =
    overrides.rings?.meta ?? JSON.parse(JSON.stringify(baseSetup.rings.meta));
  const riskReward = {
    ...baseSetup.riskReward,
    ...(overrides.riskReward ?? {}),
  };

  return {
    ...baseSetup,
    ...overrides,
    direction: overrides.direction ?? baseSetup.direction,
    rings,
    riskReward,
    eventScore: overrides.eventScore ?? rings.eventScore,
    biasScore: overrides.biasScore ?? rings.biasScore,
    sentimentScore: overrides.sentimentScore ?? rings.sentimentScore,
  };
}

const cases: TestCase[] = [
  {
    name: "High Conviction Long – ideal metrics",
    direction: "Long",
    rings: {
      trendScore: 78,
      biasScore: 85,
      sentimentScore: 70,
      orderflowScore: 65,
      eventScore: 30,
      confidenceScore: 82,
    },
    riskReward: {
      rrr: 3.5,
      riskPercent: 0.8,
      rewardPercent: 5,
      volatilityLabel: "medium",
    },
    expected: "strongLong",
  },
  {
    name: "High Conviction Short – ideal metrics",
    direction: "Short",
    rings: {
      trendScore: 80,
      biasScore: 82,
      sentimentScore: 68,
      orderflowScore: 70,
      eventScore: 25,
      confidenceScore: 78,
    },
    riskReward: {
      rrr: 3.2,
      riskPercent: 1.0,
      rewardPercent: 4.5,
      volatilityLabel: "low",
    },
    expected: "strongShort",
  },
  {
    name: "Core Long – solid metrics",
    direction: "Long",
    rings: {
      trendScore: 65,
      biasScore: 68,
      sentimentScore: 58,
      orderflowScore: 60,
      eventScore: 45,
      confidenceScore: 66,
    },
    riskReward: {
      rrr: 2.4,
      riskPercent: 1.5,
      rewardPercent: 3.5,
      volatilityLabel: "medium",
    },
    expected: "coreLong",
  },
  {
    name: "Event Risk High – Cautious despite strong base",
    direction: "Long",
    rings: {
      trendScore: 75,
      biasScore: 80,
      sentimentScore: 60,
      orderflowScore: 60,
      eventScore: 85,
      confidenceScore: 75,
    },
    riskReward: {
      rrr: 3.2,
      riskPercent: 1.0,
      rewardPercent: 4.5,
      volatilityLabel: "medium",
    },
    expected: "cautious",
  },
  {
    name: "Volatility & Conflict – Cautious",
    direction: "Short",
    rings: {
      trendScore: 72,
      biasScore: 75,
      sentimentScore: 68,
      orderflowScore: 35,
      eventScore: 55,
      confidenceScore: 55,
    },
    riskReward: {
      rrr: 2.8,
      riskPercent: 1.8,
      rewardPercent: 4.0,
      volatilityLabel: "high",
    },
    expected: "cautious",
  },
  {
    name: "No Edge – weak RRR + multiple weaknesses",
    direction: "Long",
    rings: {
      trendScore: 35,
      biasScore: 32,
      sentimentScore: 38,
      orderflowScore: 30,
      eventScore: 70,
      confidenceScore: 40,
    },
    riskReward: {
      rrr: 1.5,
      riskPercent: 3.2,
      rewardPercent: 2.0,
      volatilityLabel: "high",
    },
    expected: "noEdge",
  },
  {
    name: "Regression – strong RRR + high bias despite single weakness",
    direction: "Long",
    rings: {
      trendScore: 55,
      biasScore: 78,
      sentimentScore: 60,
      orderflowScore: 58,
      eventScore: 50,
      confidenceScore: 68,
    },
    riskReward: {
      rrr: 3.4,
      riskPercent: 1.6,
      rewardPercent: 5.0,
      volatilityLabel: "medium",
    },
    expected: "coreLong",
  },
  {
    name: "Event 74 – still Core",
    direction: "Long",
    rings: {
      trendScore: 70,
      biasScore: 72,
      sentimentScore: 60,
      orderflowScore: 60,
      eventScore: 74,
      confidenceScore: 70,
    },
    riskReward: {
      rrr: 2.6,
      riskPercent: 1.4,
      rewardPercent: 4.0,
      volatilityLabel: "medium",
    },
    expected: "coreLong",
  },
  {
    name: "Event 75 – flips to Cautious",
    direction: "Long",
    rings: {
      trendScore: 70,
      biasScore: 72,
      sentimentScore: 60,
      orderflowScore: 60,
      eventScore: 75,
      confidenceScore: 70,
    },
    riskReward: {
      rrr: 2.6,
      riskPercent: 1.4,
      rewardPercent: 4.0,
      volatilityLabel: "medium",
    },
    expected: "cautious",
  },
];

describe("classifyTradeSignal", () => {
  cases.forEach((testCase) => {
    it(testCase.name, () => {
      const setup = buildSetup({
        direction: testCase.direction,
        rings: {
          ...baseSetup.rings,
          ...testCase.rings,
          event: testCase.rings.eventScore,
          bias: testCase.rings.biasScore,
          sentiment: testCase.rings.sentimentScore,
          orderflow: testCase.rings.orderflowScore,
          confidence: testCase.rings.confidenceScore,
        },
        riskReward: {
          ...baseSetup.riskReward,
          ...testCase.riskReward,
        },
        eventScore: testCase.rings.eventScore,
        biasScore: testCase.rings.biasScore,
        sentimentScore: testCase.rings.sentimentScore,
      });

      const result = classifyTradeSignal(setup);
      expect(result).toBe(testCase.expected);
    });
  });
});
