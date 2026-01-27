import { describe, expect, it } from "vitest";
import { zPhase0Payload } from "@/src/contracts/phase0Payload.schema";

const minimalPayload = {
  ok: true,
  data: {
    meta: { assetId: "gold", profile: "SWING", timeframe: "1D", daysBack: 30 },
    decisionDistribution: {
      total: 1,
      TRADE: { count: 1, pct: 1 },
    },
    gradeDistribution: {
      total: 1,
      A: { count: 1, pct: 1 },
    },
  },
};

describe("phase0 payload contract", () => {
  it("accepts a minimal valid payload", () => {
    const result = zPhase0Payload.safeParse(minimalPayload);
    expect(result.success).toBe(true);
  });

  it("accepts a minimal valid payload for ETH", () => {
    const ethPayload = {
      ...minimalPayload,
      data: {
        ...minimalPayload.data,
        meta: { assetId: "eth", profile: "SWING", timeframe: "1D", daysBack: 30 },
      },
    };
    const result = zPhase0Payload.safeParse(ethPayload);
    expect(result.success).toBe(true);
  });

  it("fails when required meta fields are missing", () => {
    const bad = {
      ok: true,
      data: {
        meta: { profile: "SWING", timeframe: "1D", daysBack: 30 },
        decisionDistribution: { total: 0 },
      },
    };
    const result = zPhase0Payload.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
