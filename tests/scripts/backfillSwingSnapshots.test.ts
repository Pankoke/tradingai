import { describe, expect, it } from "vitest";
import { buildDateChunks } from "@/src/scripts/backfillSwingSnapshots";

describe("backfillSwingSnapshots helpers", () => {
  it("chunks dates deterministically", () => {
    const chunks = buildDateChunks(10, 3);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].length).toBeLessThanOrEqual(3);
  });
});
