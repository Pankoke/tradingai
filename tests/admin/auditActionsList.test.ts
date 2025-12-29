import { describe, expect, it } from "vitest";
import { ACTION_OPTIONS as AUDIT_ACTION_OPTIONS } from "@/src/app/[locale]/admin/(panel)/audit/page";

describe("audit action options", () => {
  it("contains swing backfill and outcomes evaluate", () => {
    expect(AUDIT_ACTION_OPTIONS).toContain("snapshot_build_swing_backfill");
    expect(AUDIT_ACTION_OPTIONS).toContain("outcomes.evaluate");
  });
});
