import { describe, expect, it } from "vitest";
import { buildProfileChipLabel } from "@/src/components/perception/setupViewModel/SetupCardHeaderBlock";

describe("SetupCardHeader profile chip label", () => {
  it("renders profile and timeframe with dot separator only", () => {
    const label = buildProfileChipLabel("SWING", "1d");
    expect(label).toBe("SWING · 1D");
  });

  it("returns null when neither profile nor timeframe given", () => {
    const label = buildProfileChipLabel(null, null);
    expect(label).toBeNull();
  });
});
