import React from "react";
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientI18nProvider } from "@/src/lib/i18n/ClientProvider";
import { DecisionSummaryCard } from "@/src/components/perception/DecisionSummaryCard";
import type { DecisionSummaryVM } from "@/src/features/perception/viewModel/decisionSummary";

const messages = {
  "setup.decisionSummary.title": "Decision Summary",
  "setup.sections.overallInterpretation": "Overall interpretation",
  "setup.sections.overallInterpretation.help": "This section summarizes the current context at a high level.",
  "setup.decisionSummary.pros": "Pros",
  "setup.decisionSummary.cautions": "Cautions",
  "setup.decisionSummary.reasonsAgainst": "Reasons against",
  "setup.decisionSummary.disclaimer.short": "Informational context only.",
  "setup.decisionSummary.disclaimer.long": "This summary is descriptive and does not provide directives.",
  "setup.decisionSummary.executionMode.confirmation": "Confirmation",
  "setup.decisionSummary.executionMode.breakout": "Breakout",
  "setup.decisionSummary.executionMode.pullback": "Pullback",
  "setup.decisionSummary.executionMode.wait": "Wait",
  "setup.decisionSummary.uncertainty.label": "Context uncertainty",
  "setup.decisionSummary.uncertainty.low": "low",
  "setup.decisionSummary.uncertainty.medium": "medium",
  "setup.decisionSummary.uncertainty.high": "high",
  "setup.decisionSummary.basedOn.label": "Based on",
  "setup.decisionSummary.basedOn.separator": " · ",
  "setup.decisionSummary.interpretation.partialAlignment": "Context indicates partial alignment for {direction} conditions.",
  "setup.decisionSummary.pro.biasStrong": "Bias context is supportive (score {score}).",
  "setup.decisionSummary.pro.rrrFavorable": "Risk/reward profile is favorable (RRR {rrr}).",
  "setup.decisionSummary.caution.eventRiskElevated": "Event-risk context is elevated (score {score}).",
  "setup.decisionSummary.reasonAgainst.eventConstraint": "Event-related constraint is active.",
} as const;

const summaryBase: DecisionSummaryVM = {
  interpretation: {
    key: "setup.decisionSummary.interpretation.partialAlignment",
    params: { direction: "long" },
  },
  band: "B",
  executionMode: "confirmation",
  pros: [
    { key: "setup.decisionSummary.pro.biasStrong", params: { score: 72 } },
    { key: "setup.decisionSummary.pro.rrrFavorable", params: { rrr: 2.3 } },
  ],
  cautions: [{ key: "setup.decisionSummary.caution.eventRiskElevated", params: { score: 74 } }],
  explainability: [
    { key: "setup.decisionSummary.pro.biasStrong", params: { score: 72 } },
    { key: "setup.decisionSummary.caution.eventRiskElevated", params: { score: 74 } },
  ],
  uncertainty: {
    level: "medium",
    key: "setup.decisionSummary.uncertainty.medium",
  },
};

function renderSummary(summary: DecisionSummaryVM): string {
  return renderToStaticMarkup(
    React.createElement(
      ClientI18nProvider,
      { messages },
      React.createElement(DecisionSummaryCard, { summary }),
    ),
  );
}

describe("DecisionSummaryCard", () => {
  test("renders title and short disclaimer", () => {
    const html = renderSummary(summaryBase);
    expect(html).toContain("data-testid=\"overall-interpretation-label\"");
    expect(html).toContain("Decision Summary");
    expect(html).toContain("Overall interpretation");
    expect(html).toContain("Informational context only.");
  });

  test("renders interpretation line from key with params", () => {
    const html = renderSummary(summaryBase);
    expect(html).toContain("Context indicates partial alignment for long conditions.");
  });

  test("renders pros and cautions bullets via key rendering", () => {
    const html = renderSummary(summaryBase);
    expect(html).toContain("Bias context is supportive (score 72).");
    expect(html).toContain("Risk/reward profile is favorable (RRR 2.3).");
    expect(html).toContain("Event-risk context is elevated (score 74).");
  });

  test("renders reasonsAgainst block only when provided", () => {
    const withReasons: DecisionSummaryVM = {
      ...summaryBase,
      reasonsAgainst: [{ key: "setup.decisionSummary.reasonAgainst.eventConstraint" }],
    };
    const withoutReasons: DecisionSummaryVM = { ...summaryBase, reasonsAgainst: undefined };

    const htmlWith = renderSummary(withReasons);
    const htmlWithout = renderSummary(withoutReasons);

    expect(htmlWith).toContain("Reasons against");
    expect(htmlWith).toContain("Event-related constraint is active.");
    expect(htmlWithout).not.toContain("Reasons against");
  });

  test("renders uncertainty marker when uncertainty is present", () => {
    const html = renderSummary(summaryBase);
    expect(html).toContain("data-testid=\"decision-summary-uncertainty\"");
    expect(html).toContain("Context uncertainty: medium");
  });

  test("renders based-on line with explainability items from i18n keys", () => {
    const html = renderSummary(summaryBase);
    expect(html).toContain("data-testid=\"decision-summary-based-on\"");
    expect(html).toContain("Based on:");
    expect(html).toContain("Bias context is supportive (score 72).");
    expect(html).toContain("Event-risk context is elevated (score 74).");
  });
});
