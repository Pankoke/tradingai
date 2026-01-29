import { describe, expect, it } from "vitest";
import { fromCounts, unknownWriteResult } from "@/src/server/storage/writeResult";

describe("writeResult helpers", () => {
  it("returns null counts with note when unknown", () => {
    const result = unknownWriteResult("counts unknown");
    expect(result.inserted).toBeNull();
    expect(result.updated).toBeNull();
    expect(result.upserted).toBeNull();
    expect(result.note).toBe("counts unknown");
  });

  it("maps provided counts into upserted", () => {
    const result = fromCounts({ inserted: 2, updated: 1 });
    expect(result.inserted).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.upserted).toBe(3);
  });
});
