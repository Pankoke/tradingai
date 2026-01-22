import { describe, expect, it } from "vitest";
import { mapOutcomeStatus } from "../../scripts/phase1/swing-outcome-analysis";

describe("mapOutcomeStatus", () => {
  it("maps known statuses", () => {
    expect(mapOutcomeStatus("hit_tp")).toBe("TP");
    expect(mapOutcomeStatus("hit_sl")).toBe("SL");
    expect(mapOutcomeStatus("expired")).toBe("EXPIRED");
    expect(mapOutcomeStatus("ambiguous")).toBe("AMBIGUOUS");
    expect(mapOutcomeStatus("invalid")).toBe("INVALID");
    expect(mapOutcomeStatus("open")).toBe("OPEN");
  });

  it("maps unknown/missing", () => {
    expect(mapOutcomeStatus(undefined)).toBe("UNKNOWN");
    expect(mapOutcomeStatus("unexpected")).toBe("UNKNOWN");
  });
});
