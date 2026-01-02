import { describe, expect, it, vi } from "vitest";
import { applyDraftToParams, createAutoApplyManager, isDraftDirty } from "@/src/components/admin/ThresholdControls";

describe("ThresholdControls helpers", () => {
  it("detects dirty state correctly", () => {
    const applied = { closedOnly: true, includeNoTrade: false, useConf: false, limit: 200, minClosedTotal: 20, minHits: 1 };
    const draftSame = { ...applied };
    const draftChanged = { ...applied, includeNoTrade: true };
    expect(isDraftDirty(applied, draftSame)).toBe(false);
    expect(isDraftDirty(applied, draftChanged)).toBe(true);
  });

  it("builds URL with updated draft params", () => {
    const draft = { closedOnly: false, includeNoTrade: true, useConf: true, limit: 100, minClosedTotal: 10, minHits: 2 };
    const url = applyDraftToParams("days=30&playbookId=gold-swing-v0.2", "/de/admin/playbooks/thresholds", draft);
    expect(url).toContain("closedOnly=0");
    expect(url).toContain("includeNoTrade=1");
    expect(url).toContain("useConf=1");
    expect(url).toContain("limit=100");
    expect(url).toContain("minClosedTotal=10");
    expect(url).toContain("minHits=2");
    expect(url).toContain("days=30");
    expect(url).toContain("playbookId=gold-swing-v0.2");
  });

  it("auto-apply triggers once after debounce", () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    const mgr = createAutoApplyManager(200);
    mgr.update({ autoApply: true, dirty: true, isPending: false, onApply: apply });
    expect(apply).not.toHaveBeenCalled();
    vi.advanceTimersByTime(199);
    expect(apply).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(apply).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("auto-apply does not run when pending", () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    const mgr = createAutoApplyManager(100);
    mgr.update({ autoApply: true, dirty: true, isPending: true, onApply: apply });
    vi.advanceTimersByTime(150);
    expect(apply).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
