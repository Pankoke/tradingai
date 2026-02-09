import { describe, expect, it } from "vitest";
import { getSetupHeaderModeLabelKey, resolvePerceptionDataMode } from "@/src/lib/config/perceptionDataMode";

describe("setup header mode label", () => {
  it("maps explicit live mode to live label key", () => {
    const mode = resolvePerceptionDataMode("live");
    expect(getSetupHeaderModeLabelKey(mode)).toBe("setup.header.mode.live");
  });

  it("maps explicit mock mode to mock label key", () => {
    const mode = resolvePerceptionDataMode("mock");
    expect(getSetupHeaderModeLabelKey(mode)).toBe("setup.header.mode.mock");
  });

  it("falls back to live for unknown input", () => {
    const mode = resolvePerceptionDataMode("unexpected");
    expect(getSetupHeaderModeLabelKey(mode)).toBe("setup.header.mode.live");
  });
});
