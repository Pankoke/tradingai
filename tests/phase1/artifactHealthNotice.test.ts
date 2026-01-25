import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtifactHealthNotice } from "@/src/components/admin/ArtifactHealthNotice";

describe("ArtifactHealthNotice", () => {
  it("renders warning when source is fs", () => {
    const html = renderToStaticMarkup(
      ArtifactHealthNotice({ source: "fs", generatedAt: "2026-01-01T00:00:00.000Z", windowDays: 30 }),
    );
    expect(html).toContain("Artefakt-Fallback oder veraltet");
  });
});
