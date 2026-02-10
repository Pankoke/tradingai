/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SetupUnifiedCard } from "@/src/components/perception/setupViewModel/SetupUnifiedCard";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";

vi.mock("@/src/lib/i18n/ClientProvider", () => ({
  useT: () => (key: string) => key,
  ClientI18nProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

const defaultRingMeta = {
  quality: "unknown" as const,
  timeframe: "unknown" as const,
};

const baseVm: SetupViewModel = {
  id: "setup-exec-1",
  assetId: "btc",
  symbol: "BTCUSD",
  timeframe: "1D",
  profile: "SWING",
  setupPlaybookId: "btc-swing-v0.1",
  direction: "Long",
  type: "Regelbasiert",
  setupGrade: "B",
  setupType: "pullback_continuation",
  gradeRationale: null,
  noTradeReason: null,
  gradeDebugReason: null,
  decision: "TRADE",
  decisionSegment: null,
  decisionVersion: "legacy",
  decisionReasons: [],
  decisionCategory: null,
  isWatchPlus: false,
  watchPlusLabel: null,
  rings: {
    trendScore: 70,
    eventScore: 35,
    biasScore: 72,
    sentimentScore: 62,
    orderflowScore: 65,
    confidenceScore: 68,
    event: 35,
    bias: 72,
    sentiment: 62,
    orderflow: 65,
    confidence: 68,
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
  eventModifier: null,
  riskReward: { riskPercent: 1, rewardPercent: 2.4, rrr: 2.4, volatilityLabel: "medium" },
  ringAiSummary: null,
  sentiment: null,
  orderflow: null,
  levelDebug: null,
  signalQuality: {
    grade: "A",
    score: 82,
    labelKey: "perception.signalQuality.grade.A",
    reasons: ["setup.scoreDrivers.signal.signalQualityStrong"],
  },
  entry: { from: 100, to: 105 },
  stop: { value: 97 },
  takeProfit: { value: 112 },
  bias: null,
  orderflowMode: null,
  meta: { eventLevel: "low" },
};

describe("SetupUnifiedCard execution progressive disclosure", () => {
  test("list mode shows summary + trigger and hides execution details initially", () => {
    render(React.createElement(SetupUnifiedCard, { vm: baseVm, mode: "list", defaultExpanded: false }));

    const trigger = screen.getByTestId("execution-disclosure-trigger");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("setup.execution.sectionTitle")).toBeDefined();
    expect(screen.getByTestId("execution-disclaimer")).toBeDefined();
    expect(screen.getByText("setup.execution.disclaimer.short")).toBeDefined();
    expect(screen.getByTestId("execution-summary-row")).toBeDefined();
    expect(screen.getByText("setups.entry")).toBeDefined();
    expect(screen.getByText("setups.stopLoss")).toBeDefined();
    expect(screen.getByText("setups.takeProfit")).toBeDefined();
    expect(screen.getByText("perception.riskReward.rrrLabel")).toBeDefined();
    expect(screen.queryByTestId("execution-detail-content")).toBeNull();
  });

  test("list mode reveals execution details after trigger click", () => {
    render(React.createElement(SetupUnifiedCard, { vm: baseVm, mode: "list", defaultExpanded: false }));

    const trigger = screen.getByTestId("execution-disclosure-trigger");
    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("execution-detail-content")).toBeDefined();
  });

  test("sotd mode keeps execution details visible without disclosure trigger", () => {
    render(React.createElement(SetupUnifiedCard, { vm: baseVm, mode: "sotd" }));

    expect(screen.getByText("setup.execution.sectionTitle")).toBeDefined();
    expect(screen.getByTestId("execution-disclaimer")).toBeDefined();
    expect(screen.getByText("setup.execution.disclaimer.short")).toBeDefined();
    expect(screen.queryByTestId("execution-disclosure-trigger")).toBeNull();
    expect(screen.queryByTestId("execution-summary-row")).toBeNull();
    expect(screen.getByTestId("execution-detail-content")).toBeDefined();
  });
});
