import { describe, expect, it } from "vitest";
import { deriveSetupProfileFromTimeframe, getSetupProfileConfig } from "@/src/lib/config/setupProfile";

describe("setupProfile config", () => {
  it("derives profiles from timeframe", () => {
    expect(deriveSetupProfileFromTimeframe("5m")).toBe("SCALP");
    expect(deriveSetupProfileFromTimeframe("15m")).toBe("SCALP");
    expect(deriveSetupProfileFromTimeframe("1h")).toBe("INTRADAY");
    expect(deriveSetupProfileFromTimeframe("4h")).toBe("INTRADAY");
    expect(deriveSetupProfileFromTimeframe("1D")).toBe("SWING");
    expect(deriveSetupProfileFromTimeframe("1W")).toBe("POSITION");
    expect(deriveSetupProfileFromTimeframe(undefined)).toBe("SWING");
  });

  it("returns config with event windows per profile", () => {
    const swing = getSetupProfileConfig("SWING");
    expect(swing.eventWindows.execMinutes).toBe(120);
    expect(swing.eventWindows.contextMinutes).toBe(2880);
    const scalps = getSetupProfileConfig("SCALP");
    expect(scalps.eventWindows.execMinutes).toBeGreaterThan(0);
  });
});
