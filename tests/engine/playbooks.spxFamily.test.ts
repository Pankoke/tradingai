import { describe, expect, it, vi } from "vitest";
import { resolvePlaybook } from "@/src/lib/engine/playbooks";
import type { PlaybookContext } from "@/src/lib/engine/playbooks";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";
import { deriveRegimeTag } from "@/src/lib/engine/metrics/regime";

vi.mock("@/src/lib/engine/metrics/regime", () => ({
  deriveRegimeTag: vi.fn(() => "TREND"),
}));

const baseSignalQuality: SignalQuality = {
  grade: "A",
  score: 60,
  labelKey: "ok",
  reasons: [],
};

function buildContext(overrides: Partial<PlaybookContext> = {}): PlaybookContext {
  return {
    asset: { id: "spx", symbol: "^GSPC", name: "SPX" },
    profile: "swing",
    rings: {
      trendScore: 70,
      biasScore: 75,
      sentimentScore: 60,
      orderflowScore: 60,
      bias: 75,
      trend: 70,
      sentiment: 60,
      orderflow: 60,
    },
    signalQuality: baseSignalQuality,
    levels: {
      riskReward: { riskPercent: 5, rewardPercent: 8, rrr: 1.6, volatilityLabel: "low" },
    },
    ...overrides,
  };
}

describe("SPX-family swing playbooks", () => {
  it("medium volatility is soft (no hard NO_TRADE)", () => {
    (deriveRegimeTag as unknown as vi.Mock).mockReturnValue("TREND");
    const playbook = resolvePlaybook({ id: "spx", symbol: "^GSPC", name: "SPX" }, "swing");
    const result = playbook.evaluateSetup(
      buildContext({
        levels: { riskReward: { riskPercent: 5, rewardPercent: 8, rrr: 1.6, volatilityLabel: "medium" } },
      }),
    );
    expect(result.setupGrade).not.toBe("NO_TRADE");
  });

  it("high volatility remains hard NO_TRADE", () => {
    (deriveRegimeTag as unknown as vi.Mock).mockReturnValue("TREND");
    const playbook = resolvePlaybook({ id: "spx", symbol: "^GSPC", name: "SPX" }, "swing");
    const result = playbook.evaluateSetup(
      buildContext({
        levels: { riskReward: { riskPercent: 7, rewardPercent: 8, rrr: 1.1, volatilityLabel: "high" } },
      }),
    );
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase() ?? "").toContain("volatility");
  });

  it("range regime stays watch/no-trade", () => {
    (deriveRegimeTag as unknown as vi.Mock).mockReturnValue("RANGE");
    const playbook = resolvePlaybook({ id: "spx", symbol: "^GSPC", name: "SPX" }, "swing");
    const result = playbook.evaluateSetup(buildContext());
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase() ?? "").toContain("range");
  });

  it("passes with relaxed thresholds just above new mins", () => {
    (deriveRegimeTag as unknown as vi.Mock).mockReturnValue("TREND");
    const playbook = resolvePlaybook({ id: "spx", symbol: "^GSPC", name: "SPX" }, "swing");
    const result = playbook.evaluateSetup(
      buildContext({
        rings: {
          trendScore: 56,
          biasScore: 66,
          sentimentScore: 60,
          orderflowScore: 52,
          bias: 66,
          trend: 56,
          sentiment: 60,
          orderflow: 52,
        },
        signalQuality: { ...baseSignalQuality, score: 52 },
        levels: { riskReward: { riskPercent: 5, rewardPercent: 8, rrr: 1.6, volatilityLabel: "low" } },
      }),
    );
    expect(result.setupGrade).not.toBe("NO_TRADE");
  });

  it("fails when below relaxed bias threshold", () => {
    (deriveRegimeTag as unknown as vi.Mock).mockReturnValue("TREND");
    const playbook = resolvePlaybook({ id: "spx", symbol: "^GSPC", name: "SPX" }, "swing");
    const result = playbook.evaluateSetup(
      buildContext({
        rings: {
          trendScore: 60,
          biasScore: 63,
          sentimentScore: 60,
          orderflowScore: 55,
          bias: 63,
          trend: 60,
          sentiment: 60,
          orderflow: 55,
        },
        signalQuality: { ...baseSignalQuality, score: 52 },
      }),
    );
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase() ?? "").toContain("bias");
  });
});
