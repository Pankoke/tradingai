import { describe, expect, it } from "vitest";
import type { PlaybookContext } from "@/src/lib/engine/playbooks";
import { playbookTestExports } from "@/src/lib/engine/playbooks";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";

const baseSignalQuality: SignalQuality = {
  grade: "A",
  score: 80,
  labelKey: "test",
  reasons: [],
};

function buildGoldContext(minutesToEvent: number): PlaybookContext {
  return {
    asset: { id: "gold", symbol: "GOLD", name: "Gold" },
    rings: {
      trendScore: 80,
      biasScore: 85,
      sentimentScore: 60,
      orderflowScore: 60,
    },
    eventModifier: {
      classification: "execution_critical",
      primaryEvent: { minutesToEvent },
    },
    signalQuality: baseSignalQuality,
    levels: {
      entryZone: "1900",
      stopLoss: "1880",
      takeProfit: "1940",
      riskReward: { rrr: 2, riskPercent: 1, rewardPercent: 2, volatilityLabel: "medium" },
    },
  };
}

describe("Swing event window hard block", () => {
  it("does not block execution_critical events beyond 24h", () => {
    const context = buildGoldContext(30 * 60); // 30h
    const result = playbookTestExports.evaluateGoldSwing(context);

    expect(result.setupGrade).not.toBe("NO_TRADE");
    expect(result.noTradeReason ?? "").not.toContain("Execution-critical event");
  });

  it("hard blocks execution_critical events within 24h", () => {
    const context = buildGoldContext(12 * 60); // 12h
    const result = playbookTestExports.evaluateGoldSwing(context);

    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason).toContain("Execution-critical event within 24h");
  });
});
