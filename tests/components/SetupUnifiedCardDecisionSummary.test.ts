import React from "react";
import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
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
  id: "setup-1",
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
    reasons: ["perception.signalQuality.reason.default"],
  },
  entry: { from: 100, to: 105 },
  stop: { value: 97 },
  takeProfit: { value: 112 },
  bias: null,
  orderflowMode: null,
  meta: { eventLevel: "low" },
};

function renderCard(defaultExpanded: boolean, mode: "list" | "sotd" = "list"): string {
  return renderToStaticMarkup(
    React.createElement(SetupUnifiedCard, {
      vm: baseVm,
      mode,
      defaultExpanded,
    }),
  );
}

describe("SetupUnifiedCard decision summary integration", () => {
  test("renders decision summary when expanded=true", () => {
    const html = renderCard(true);
    expect(html).toContain("data-testid=\"decision-summary-layer\"");
    expect(html).toContain("setup.decisionSummary.title");
    expect(html).toContain("data-testid=\"interpretation-framing\"");
    expect(html).toContain("setup.phase4a.interpretationFraming.label");
  });

  test("does not render decision summary when expanded=false", () => {
    const html = renderCard(false);
    expect(html).not.toContain("data-testid=\"decision-summary-layer\"");
    expect(html).not.toContain("setup.decisionSummary.title");
  });

  test("renders input metrics section label in list and sotd score layers", () => {
    const listHtml = renderCard(true, "list");
    const sotdHtml = renderCard(true, "sotd");
    expect(listHtml).toContain("data-testid=\"input-metrics-label\"");
    expect(listHtml).toContain("setup.sections.inputMetrics");
    expect(listHtml).toContain("data-testid=\"scores-context-microcopy\"");
    expect(listHtml).toContain("setup.phase4a.scoresContext");
    expect(sotdHtml).toContain("data-testid=\"input-metrics-label\"");
    expect(sotdHtml).toContain("setup.sections.inputMetrics");
    expect(sotdHtml).toContain("data-testid=\"scores-context-microcopy\"");
    expect(sotdHtml).toContain("setup.phase4a.scoresContext");
  });

  test("renders drivers framing microcopy in list and sotd when drivers layer is visible", () => {
    const listHtml = renderCard(true, "list");
    const sotdHtml = renderCard(true, "sotd");

    expect(listHtml).toContain("data-testid=\"drivers-framing\"");
    expect(listHtml).toContain("setup.phase4a.driversFraming.line");
    expect(sotdHtml).toContain("data-testid=\"drivers-framing\"");
    expect(sotdHtml).toContain("setup.phase4a.driversFraming.line");
  });
});
