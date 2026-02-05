import { describe, expect, it } from "vitest";
import type { PlaybookContext } from "@/src/lib/engine/playbooks";
import { playbookTestExports } from "@/src/lib/engine/playbooks";

const { evaluateDefault } = playbookTestExports;

const baseContext: PlaybookContext = {
  asset: { id: "spx", symbol: "^GSPC", name: "S&P 500" },
  profile: "swing",
  rings: {
    trendScore: 50,
    biasScore: 50,
    sentimentScore: 50,
    orderflowScore: 50,
    bias: 50,
    trend: 50,
    sentiment: 50,
    orderflow: 50,
  },
};

describe("default swing playbook thresholds", () => {
  it("assigns B when above relaxed bias/trend thresholds", () => {
    const result = evaluateDefault({
      ...baseContext,
      rings: { ...baseContext.rings, biasScore: 66, trendScore: 41 },
    });
    expect(result.setupGrade).toBe("B");
  });

  it("keeps NO_TRADE when bias below relaxed threshold", () => {
    const result = evaluateDefault({
      ...baseContext,
      rings: { ...baseContext.rings, biasScore: 64, trendScore: 41 },
    });
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase() ?? "").toContain("alignment");
  });

  it("derives short direction when bias very low but trend ok", () => {
    const result = evaluateDefault({
      ...baseContext,
      rings: { ...baseContext.rings, biasScore: 45, trendScore: 55 },
    });
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toUpperCase() ?? "").toContain("SHORT");
  });
});
