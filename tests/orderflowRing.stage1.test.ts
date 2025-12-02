import { describe, expect, it } from "vitest";
import { computeRingsFromSource } from "@/src/lib/engine/rings";

describe("Orderflow Stage-1 behavior", () => {
  it("high momentum/vol with long direction gives strong flow", () => {
    const { orderflow } = computeRingsFromSource({
      direction: "long",
      breakdown: {
        momentum: 80,
        volatility: 70,
      },
    });
    expect(orderflow).toBeGreaterThanOrEqual(65);
  });

  it("same energy but short direction lowers the score slightly", () => {
    const { orderflow } = computeRingsFromSource({
      direction: "short",
      breakdown: {
        momentum: 80,
        volatility: 70,
      },
    });
    expect(orderflow).toBeGreaterThanOrEqual(55);
    expect(orderflow).toBeLessThan(65);
  });

  it("sleepy market yields weak orderflow", () => {
    const { orderflow } = computeRingsFromSource({
      breakdown: {
        momentum: 30,
        volatility: 30,
      },
    });
    expect(orderflow).toBeLessThan(45);
  });

  it("fallback uses balance score when no breakdown exists", () => {
    const { orderflow } = computeRingsFromSource({
      balanceScore: 80,
    });
    expect(orderflow).toBeGreaterThanOrEqual(60);
  });

  it("defaults to neutral when no data is present", () => {
    const { orderflow } = computeRingsFromSource({});
    expect(orderflow).toBe(50);
  });
});
