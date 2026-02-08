import { describe, expect, it } from "vitest";
import { buildImportPreviewHash } from "@/src/lib/admin/import/previewHash";

describe("buildImportPreviewHash", () => {
  it("is stable for same payload", () => {
    const a = buildImportPreviewHash({ entityType: "assets", mode: "preview", csvText: "a,b\n1,2\n" });
    const b = buildImportPreviewHash({ entityType: "assets", mode: "preview", csvText: "a,b\n1,2\n" });
    expect(a).toBe(b);
  });

  it("changes with different entity or content", () => {
    const base = buildImportPreviewHash({ entityType: "assets", mode: "preview", csvText: "a,b\n1,2\n" });
    const otherEntity = buildImportPreviewHash({ entityType: "events", mode: "preview", csvText: "a,b\n1,2\n" });
    const otherContent = buildImportPreviewHash({ entityType: "assets", mode: "preview", csvText: "a,b\n1,3\n" });
    expect(base).not.toBe(otherEntity);
    expect(base).not.toBe(otherContent);
  });
});
