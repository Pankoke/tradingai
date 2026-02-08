import { beforeEach, describe, expect, it, vi } from "vitest";
import { previewEventsImport } from "@/src/lib/admin/import/eventsImport";

const mockGetEventsByIds = vi.fn();

vi.mock("@/src/server/repositories/eventRepository", async () => {
  const actual = await vi.importActual("@/src/server/repositories/eventRepository");
  return {
    ...actual,
    getEventsByIds: (...args: unknown[]) => mockGetEventsByIds(...args),
  };
});

describe("previewEventsImport", () => {
  beforeEach(() => {
    mockGetEventsByIds.mockResolvedValue([
      {
        id: "ev1",
        providerId: null,
        title: "US CPI",
        description: null,
        category: "macro",
        impact: 3,
        country: "US",
        summary: null,
        marketScope: null,
        expectationLabel: null,
        expectationConfidence: null,
        expectationNote: null,
        enrichedAt: null,
        scheduledAt: new Date("2026-01-03T12:30:00.000Z"),
        actualValue: null,
        previousValue: null,
        forecastValue: null,
        affectedAssets: null,
        source: "jb-news",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
  });

  it("classifies rows and reports errors", async () => {
    const csv = [
      "eventId,title,category,impact,source,scheduledAt,extra",
      "ev1,US CPI,macro,3,jb-news,2026-01-03T12:30:00Z,x",
      "ev2,FOMC,macro,3,jb-news,2026-01-29T19:00:00Z,x",
      ",Missing Id,macro,3,jb-news,2026-01-29T19:00:00Z,x",
    ].join("\n");
    const result = await previewEventsImport(csv);
    expect(result.summary.rowsTotal).toBe(3);
    expect(result.summary.creates).toBe(1);
    expect(result.summary.skips + result.summary.updates).toBeGreaterThanOrEqual(1);
    expect(result.summary.errors).toBe(1);
    expect(result.summary.ignoredColumns).toContain("extra");
  });
});
