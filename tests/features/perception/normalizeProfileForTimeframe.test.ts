import { describe, expect, it } from "vitest";
import { normalizeProfileForTimeframe } from "@/src/features/perception/build/buildSetups";

describe("normalizeProfileForTimeframe", () => {
  it("forces swing for 1D timeframe even if profile looks intraday/daytrade", () => {
    const result = normalizeProfileForTimeframe("daytrade", "1D");
    expect(result).toBe("SWING");
    const result2 = normalizeProfileForTimeframe("intraday", "1w");
    expect(result2).toBe("POSITION");
  });

  it("keeps intraday when timeframe is intraday", () => {
    const result = normalizeProfileForTimeframe("intraday", "1H");
    expect(result).toBe("INTRADAY");
  });

  it("defaults to derived when profile missing", () => {
    expect(normalizeProfileForTimeframe(undefined, "1D")).toBe("SWING");
    expect(normalizeProfileForTimeframe(null, "1W")).toBe("POSITION");
  });
});
