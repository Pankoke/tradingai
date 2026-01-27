import { describe, expect, it } from "vitest";
import { buildHref, buildOverviewHref } from "@/src/app/[locale]/admin/(panel)/outcomes/href";

describe("buildHref", () => {
  it("builds default link with locale and days", () => {
    const href = buildHref({ locale: "en", days: 30 });
    expect(href).toBe("/en/admin/outcomes?days=30");
  });

  it("includes all optional params with deterministic ordering", () => {
    const href = buildHref({
      locale: "de",
      days: 90,
      assetId: "wti",
      playbookId: "energy-swing-v0.1",
      showNoTradeType: true,
      includeAllGrades: true,
      includeNoTrade: true,
    });
    expect(href).toBe(
      "/de/admin/outcomes?days=90&assetId=wti&playbookId=energy-swing-v0.1&includeAllGrades=1&includeNoTrade=1&showNoTradeType=1",
    );
  });

  it("omits params when flags are false/undefined", () => {
    const href = buildHref({
      locale: "en",
      days: 7,
      assetId: "gold",
      includeAllGrades: false,
      includeNoTrade: false,
    });
    expect(href).toBe("/en/admin/outcomes?days=7&assetId=gold");
  });

  it("builds overview link", () => {
    const href = buildOverviewHref({ locale: "en", days: 60, assetId: "wti", playbookId: "energy-swing-v0.1" });
    expect(href).toBe("/en/admin/outcomes/overview?timeframe=all&label=all&minClosed=20&days=60");
  });
});
