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
  test("does not choose event branch when ring eventScore is low even if meta is high", () => {
    const vm = makeVm({ meta: { eventLevel: "high" }, rings: { eventScore: 38 } as SetupViewModel["rings"] });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, false);
    expect(result.debug.branch).toBe("sizeStandard");
    expect(result.debug.execEventLevel).toBe("calm");
    expect(result.debug.metaEventLevel).toBe("highSoon");
  });

  test("uses named event when ring eventScore is high and title present", () => {
    const vm = makeVm({
      rings: { eventScore: 75 } as SetupViewModel["rings"],
      eventContext: { topEvents: [{ title: "CPI" }] } as unknown as SetupViewModel["eventContext"],
    });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, false);
    expect(result.text).toContain("CPI");
    expect(result.debug.branch).toBe("eventNamed");
    expect(result.debug.eventLevel).toBe("highSoon");
    expect(result.debug.execEventLevel).toBe("highSoon");
    expect(result.debug.topEventsCount).toBe(1);
    expect(result.debug.topEventTitleRaw).toBe("CPI");
    expect(result.debug.topEventTitleSanitized).toBe("CPI");
  });

  test("uses event branch when eventScore is elevated and title present", () => {
    const vm = makeVm({
      rings: { eventScore: 55 } as SetupViewModel["rings"],
      eventContext: { topEvents: [{ title: "GDP q/q" }] } as unknown as SetupViewModel["eventContext"],
    });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, false);
    expect(result.debug.branch).toBe("eventNamed");
    expect(result.debug.execEventLevel).toBe("elevated");
  });

  test("uses orderflow high and low thresholds", () => {
    const high = makeVm({ rings: { orderflowScore: 80 } as SetupViewModel["rings"] });
    const highResult = pickCollapsedExecutionPrimaryBullet(high, t, false);
    expect(highResult.debug.branch).toBe("orderflowHigh");

    const low = makeVm({ rings: { orderflowScore: 30 } as SetupViewModel["rings"] });
    const lowResult = pickCollapsedExecutionPrimaryBullet(low, t, false);
    expect(lowResult.debug.branch).toBe("orderflowLow");
  });

  test("falls back to confirmation when trend and bias diverge", () => {
    const vm = makeVm({ rings: { trendScore: 90, biasScore: 50 } as SetupViewModel["rings"] });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, false);
    expect(result.debug.branch).toBe("confirmation");
  });

  test("defaults to sizing variants when no other rule matches", () => {
    const strong = makeVm({
      rings: { confidenceScore: 75 } as SetupViewModel["rings"],
      signalQuality: { score: 70, reasons: [] },
    });
    expect(pickCollapsedExecutionPrimaryBullet(strong, t, false).debug.branch).toBe("sizeNormalPlus");

    const standard = makeVm({
      rings: { confidenceScore: 55 } as SetupViewModel["rings"],
      signalQuality: { score: 55, reasons: [] },
    });
    expect(pickCollapsedExecutionPrimaryBullet(standard, t, false).debug.branch).toBe("sizeStandard");

    const reduced = makeVm({
      rings: { confidenceScore: 40 } as SetupViewModel["rings"],
      signalQuality: { score: 30, reasons: [] },
    });
    expect(pickCollapsedExecutionPrimaryBullet(reduced, t, false).debug.branch).toBe("sizeReduced");
  });

  test("sanitizes and truncates long event titles", () => {
    const longTitle = "Very Important Event That Has A Super Long Name That Should Be Trimmed For UI Safety";
    const vm = makeVm({
      rings: { eventScore: 80 } as SetupViewModel["rings"],
      eventContext: { topEvents: [{ title: longTitle }] } as unknown as SetupViewModel["eventContext"],
    });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, false);
    expect(result.debug.branch).toBe("eventNamed");
    expect((result.debug.topEventTitleSanitized ?? "").length).toBeLessThanOrEqual(60);
    expect(result.debug.topEventTitleTruncated).toBe(true);
  });

  test("falls back to generic when event title is empty after sanitization", () => {
    const vm = makeVm({
      rings: { eventScore: 70 } as SetupViewModel["rings"],
      eventContext: { topEvents: [{ title: "   " }] } as unknown as SetupViewModel["eventContext"],
    });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, false);
    expect(result.debug.branch).toBe("eventGeneric");
    expect(result.debug.topEventTitleEmptyAfterSanitize).toBe(true);
  });

  test("keeps simple ascii slash titles intact", () => {
    const vm = makeVm({
      rings: { eventScore: 80 } as SetupViewModel["rings"],
      eventContext: { topEvents: [{ title: "GDP q/q" }] } as unknown as SetupViewModel["eventContext"],
    });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, false);
    expect(result.debug.branch).toBe("eventNamed");
    expect(result.debug.topEventTitleSanitized).toBe("GDP q/q");
    expect(result.debug.topEventTitleEmptyAfterSanitize).toBe(false);
  });

  test("removes zero-width characters", () => {
    const vm = makeVm({
      rings: { eventScore: 80 } as SetupViewModel["rings"],
      eventContext: { topEvents: [{ title: "CPI\u200B\u200D (High Impact)" }] } as unknown as SetupViewModel["eventContext"],
    });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, false);
    expect(result.debug.branch).toBe("eventNamed");
    expect(result.debug.topEventTitleSanitized).toBe("CPI (High Impact)");
    expect(result.debug.topEventTitleEmptyAfterSanitize).toBe(false);
  });

  test("ignores event branch when modifier is enabled", () => {
    const vm = makeVm({
      rings: { eventScore: 90 } as SetupViewModel["rings"],
      eventContext: { topEvents: [{ title: "CPI" }] } as unknown as SetupViewModel["eventContext"],
    });
    const result = pickCollapsedExecutionPrimaryBullet(vm, t, true);
    expect(result.debug.branch).not.toBe("eventNamed");
    expect(result.debug.execEventLevel).toBe("calm");
  });
});
