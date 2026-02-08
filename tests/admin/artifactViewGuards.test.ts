import { describe, expect, it } from "vitest";
import { DEFAULT_RAW_JSON_MAX_BYTES, shouldRenderRawJson } from "@/src/lib/admin/artifacts/viewGuards";

describe("artifact view guards", () => {
  it("renders raw json only when size is within configured limit", () => {
    expect(shouldRenderRawJson(0)).toBe(true);
    expect(shouldRenderRawJson(DEFAULT_RAW_JSON_MAX_BYTES)).toBe(true);
    expect(shouldRenderRawJson(DEFAULT_RAW_JSON_MAX_BYTES + 1)).toBe(false);
  });

  it("rejects invalid byte sizes", () => {
    expect(shouldRenderRawJson(Number.NaN)).toBe(false);
    expect(shouldRenderRawJson(-1)).toBe(false);
  });
});
