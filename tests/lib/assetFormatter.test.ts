import { describe, expect, it } from "vitest";
import { formatAssetLabel } from "@/src/lib/formatters/asset";

describe("asset formatter", () => {
  it("formats symbol and name without mojibake separator", () => {
    const label = formatAssetLabel("wti", "CL=F");
    expect(label).toBe("WTI - Crude Oil WTI");
    expect(label).not.toContain("Жњ");
    expect(label).not.toContain("Ð–Ñš");
    expect(label).not.toContain("Ãâ€“Ã‘Å¡");
  });

  it("returns only symbol when symbol and name are equal", () => {
    const label = formatAssetLabel("unknown-asset", "ABC");
    expect(label).toBe("ABC");
  });

  it("sanitizes mojibake in unknown fallback symbols", () => {
    const label = formatAssetLabel(undefined, "GBP/USD Жњ British Pound vs. US Dollar");
    expect(label).toBe("GBP/USD - British Pound vs. US Dollar");
    expect(label).not.toContain("Жњ");
  });
});
