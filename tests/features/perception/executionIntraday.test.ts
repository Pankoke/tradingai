import { describe, it, expect } from "vitest";
import { __test_buildExecutionContent } from "@/src/components/perception/setupViewModel/SetupUnifiedCard";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import type { useT } from "@/src/lib/i18n/ClientProvider";

const baseRings: SetupViewModel["rings"] = {
  trendScore: 0,
  eventScore: 0,
  biasScore: 0,
  sentimentScore: 0,
  orderflowScore: 0,
  confidenceScore: 0,
  event: 0,
  bias: 0,
  sentiment: 0,
  orderflow: 0,
  confidence: 0,
  meta: {
    trend: { quality: "unknown" },
    event: { quality: "unknown" },
    bias: { quality: "unknown" },
    sentiment: { quality: "unknown" },
    orderflow: { quality: "unknown" },
    confidence: { quality: "unknown" },
  },
};

const baseVm: SetupViewModel = {
  id: "s1",
  assetId: "a1",
  symbol: "BTCUSDT",
  timeframe: "1H",
  profile: "INTRADAY",
  direction: "Long",
  entry: { from: null, to: null },
  stop: { value: null },
  takeProfit: { value: null },
  rings: { ...baseRings, confidenceScore: 60, eventScore: 0 },
};

const tStub: ReturnType<typeof useT> = (key: string) => {
  const table: Record<string, string> = {
    "perception.execution.intraday.title": "intraday",
    "perception.execution.intraday.titleEvent": "event intraday",
    "perception.execution.intraday.titleContext": "context intraday",
    "perception.execution.intraday.titleAwareness": "awareness intraday",
    "perception.execution.intraday.critical.wait": "wait for release/statement; avoid pre-release breakout",
    "perception.execution.intraday.critical.confirm": "confirm after release",
    "perception.execution.intraday.critical.size": "size down",
    "perception.execution.intraday.context.buffer": "buffer around event",
    "perception.execution.intraday.context.confirm": "level confirmation 1H",
    "perception.execution.intraday.context.trim": "trim size on vol",
    "perception.execution.intraday.awareness.monitor": "monitor context",
    "perception.execution.intraday.awareness.size": "moderate size",
    "perception.execution.intraday.base.confirm": "wait for 1H confirmation",
    "perception.execution.intraday.base.size": "partial fills size down",
    "perception.execution.intraday.base.skip": "skip if liquidity poor",
    "perception.execution.position.title": "position exec",
    "perception.execution.position.titleEvent": "position event risk",
    "perception.execution.position.titleContext": "position with event",
    "perception.execution.position.baseRisk": "wider stops and smaller size",
    "perception.execution.position.baseConfirm": "wait for weekly/daily level confirmation",
    "perception.execution.position.baseReview": "reassess on weekly close",
    "perception.execution.position.critical.delay": "avoid initiating right before the event; wait for post-event weekly/daily confirmation",
    "perception.execution.position.context.volatility": "factor expected volatility; consider delaying entries",
    "perception.execution.title.eventDriven": "perception.execution.title.eventDriven",
  };
  return table[key] ?? key;
};

describe("intraday execution content", () => {
  it("uses timing/confirmation copy when intraday without events", () => {
    const result = __test_buildExecutionContent(baseVm, tStub, true);
    expect(result.title.toLowerCase()).toContain("intraday");
    expect(result.bullets.some((b) => b.toLowerCase().includes("confirmation"))).toBe(true);
    expect(result.bullets.some((b) => b.toLowerCase().includes("size"))).toBe(true);
  });

  it("adds wait/confirm copy when execution_critical", () => {
    const vm: SetupViewModel = { ...baseVm, eventModifier: { classification: "execution_critical" } };
    const result = __test_buildExecutionContent(vm, tStub, true);
    expect(result.title.toLowerCase()).toContain("event");
    expect(result.bullets.join(" ").toLowerCase()).toContain("wait for release");
    expect(result.bullets.join(" ").toLowerCase()).toContain("confirm");
  });

  it("keeps swing copy untouched", () => {
    const swingVm: SetupViewModel = {
      ...baseVm,
      profile: "SWING",
      rings: { ...baseRings, eventScore: 80, confidenceScore: 80 },
      entry: { from: null, to: null },
      stop: { value: null },
      takeProfit: { value: null },
    };
    const result = __test_buildExecutionContent(swingVm, tStub, false);
    expect(result.title).toContain("perception.execution.title.eventDriven");
  });
});

describe("position execution content", () => {
  const basePos: SetupViewModel = {
    ...baseVm,
    profile: "POSITION",
    timeframe: "1W",
    rings: { ...baseRings, confidenceScore: 60, eventScore: 0 },
  };

  it("uses weekly/daily framing and risk notes", () => {
    const result = __test_buildExecutionContent(basePos, tStub, true);
    expect(result.title.toLowerCase()).toContain("position");
    expect(result.bullets.join(" ").toLowerCase()).toContain("weekly");
    expect(result.bullets.join(" ").toLowerCase()).toContain("size");
  });

  it("event critical delays initiation post-event", () => {
    const vm: SetupViewModel = { ...basePos, eventModifier: { classification: "execution_critical" } };
    const result = __test_buildExecutionContent(vm, tStub, true);
    expect(result.bullets.join(" ").toLowerCase()).toContain("avoid initiating");
    expect(result.bullets.join(" ").toLowerCase()).toContain("post-event");
  });
});
