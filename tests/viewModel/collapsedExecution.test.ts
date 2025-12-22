import { describe, expect, test } from "vitest";

import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { pickCollapsedExecutionPrimaryBullet } from "@/src/components/perception/setupViewModel/SetupUnifiedCard";

const defaultRingMeta = {
  quality: "unknown" as const,
  timeframe: "unknown" as const,
};

const defaultVm: SetupViewModel = {
  id: "id",
  assetId: "asset",
  symbol: "SYM",
  timeframe: "1D",
  direction: "Long",
  type: null,
  rings: {
    trendScore: 50,
    eventScore: 0,
    biasScore: 50,
    sentimentScore: 50,
    orderflowScore: 50,
    confidenceScore: 50,
    event: 50,
    bias: 50,
    sentiment: 50,
    orderflow: 50,
    confidence: 50,
    meta: {
      trend: { ...defaultRingMeta },
      event: { ...defaultRingMeta },
      bias: { ...defaultRingMeta },
      sentiment: { ...defaultRingMeta },
      orderflow: { ...defaultRingMeta },
      confidence: { ...defaultRingMeta },
    },
  },
  eventContext: null,
  riskReward: null,
  ringAiSummary: null,
  sentiment: null,
  levelDebug: null,
  signalQuality: { score: 50, reasons: [] },
  entry: { from: null, to: null },
  stop: { value: null },
  takeProfit: { value: null },
  bias: null,
  orderflowMode: null,
  meta: { eventLevel: null },
};

const t = (key: string): string => key;

function makeVm(overrides: Partial<SetupViewModel> = {}): SetupViewModel {
  return {
    ...defaultVm,
    ...overrides,
    rings: { ...defaultVm.rings, ...overrides.rings, meta: defaultVm.rings.meta },
    meta: { ...defaultVm.meta, ...overrides.meta },
    signalQuality: { ...defaultVm.signalQuality, ...overrides.signalQuality },
  };
}

describe("pickCollapsedExecutionPrimaryBullet", () => {
  test("prioritises event timing when event level is elevated/high", () => {
    const vm = makeVm({ meta: { eventLevel: "high" } });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t);
    expect(result).toBe("perception.execution.collapsed.eventGeneric");
  });

  test("uses named event when available", () => {
    const vm = makeVm({
      meta: { eventLevel: "high" },
      eventContext: { topEvents: [{ title: "CPI" }] } as unknown as SetupViewModel["eventContext"],
    });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t);
    expect(result).toBe("perception.execution.collapsed.eventNamed");
  });

  test("uses orderflow high and low thresholds", () => {
    const high = makeVm({ rings: { orderflowScore: 80 } as SetupViewModel["rings"] });
    expect(pickCollapsedExecutionPrimaryBullet(high, t)).toBe(
      "perception.execution.collapsed.primary.orderflowHigh",
    );

    const low = makeVm({ rings: { orderflowScore: 30 } as SetupViewModel["rings"] });
    expect(pickCollapsedExecutionPrimaryBullet(low, t)).toBe(
      "perception.execution.collapsed.primary.orderflowLow",
    );
  });

  test("falls back to confirmation when trend and bias diverge", () => {
    const vm = makeVm({ rings: { trendScore: 90, biasScore: 50 } as SetupViewModel["rings"] });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t);
    expect(result).toBe("perception.execution.collapsed.primary.confirmation");
  });

  test("defaults to sizing variants when no other rule matches", () => {
    const strong = makeVm({
      rings: { confidenceScore: 75 } as SetupViewModel["rings"],
      signalQuality: { score: 70, reasons: [] },
    });
    expect(pickCollapsedExecutionPrimaryBullet(strong, t)).toBe(
      "perception.execution.collapsed.primary.sizeNormalPlus",
    );

    const standard = makeVm({
      rings: { confidenceScore: 55 } as SetupViewModel["rings"],
      signalQuality: { score: 55, reasons: [] },
    });
    expect(pickCollapsedExecutionPrimaryBullet(standard, t)).toBe(
      "perception.execution.collapsed.primary.sizeStandard",
    );

    const reduced = makeVm({
      rings: { confidenceScore: 40 } as SetupViewModel["rings"],
      signalQuality: { score: 30, reasons: [] },
    });
    expect(pickCollapsedExecutionPrimaryBullet(reduced, t)).toBe(
      "perception.execution.collapsed.primary.sizeReduced",
    );
  });
});
