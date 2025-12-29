import { describe, expect, it } from "vitest";
import { buildDateChunks } from "@/src/scripts/backfillDailyCandles";

describe("buildDateChunks", () => {
  it("builds non-overlapping chunks covering range", () => {
    const from = new Date(Date.UTC(2025, 0, 1));
    const to = new Date(Date.UTC(2025, 0, 10));
    const chunks = buildDateChunks(from, to, 3);
    expect(chunks.length).toBe(4);
    expect(chunks[0].from.toISOString().slice(0, 10)).toBe("2025-01-01");
    expect(chunks[0].to.toISOString().slice(0, 10)).toBe("2025-01-03");
    expect(chunks[3].to.toISOString().slice(0, 10)).toBe("2025-01-10");
  });
});
