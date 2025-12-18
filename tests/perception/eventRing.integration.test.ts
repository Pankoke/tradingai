import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveEventRingForSetup } from "@/src/lib/engine/perceptionEngine";
import { mockSetups } from "@/src/lib/mockSetups";
import type { Event as BiasEvent } from "@/src/lib/engine/eventsBiasTypes";
import { computeEventRingV2 } from "@/src/lib/engine/modules/eventRingV2";

vi.mock("@/src/lib/engine/modules/eventRingV2", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/engine/modules/eventRingV2")>(
    "@/src/lib/engine/modules/eventRingV2",
  );
  return {
    ...actual,
    computeEventRingV2: vi.fn(),
  };
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("resolveEventRingForSetup", () => {
  it("uses eventRingV2 in live mode and propagates context fields", async () => {
    const setup = {
      ...mockSetups[0],
      eventContext: null,
    };
    const now = new Date("2025-01-01T12:00:00Z");
    const mockedWindowFrom = new Date("2025-01-01T11:00:00Z");
    const mockedWindowTo = new Date("2025-01-02T11:00:00Z");
    vi.mocked(computeEventRingV2).mockResolvedValue({
      score: 77,
      context: {
        windowFrom: mockedWindowFrom,
        windowTo: mockedWindowTo,
        windowKind: "daily",
        eventCountInWindow: 2,
        notes: ["high_impact_soon"],
        topEvents: [
          {
            title: "CPI",
            scheduledAt: "2025-01-01T12:30:00Z",
            impact: 3,
            category: "macro",
            timeToEventMinutes: 30,
          },
        ],
      },
    });

    const result = await resolveEventRingForSetup({
      setup,
      asOf: now,
      dataMode: "live",
      fallbackEvents: [],
    });

    expect(result.eventScore).toBe(77);
    expect(result.eventContext?.windowFrom).toBe(mockedWindowFrom.toISOString());
    expect(result.eventContext?.windowKind).toBe("daily");
    expect(result.eventContext?.notes).toContain("high_impact_soon");
    expect(result.eventContext?.topEvents?.[0]?.title).toBe("CPI");
    expect(computeEventRingV2).toHaveBeenCalledTimes(1);
  });

  it("keeps v2 notes when no events exist in window", async () => {
    const setup = {
      ...mockSetups[0],
      eventContext: null,
    };
    vi.mocked(computeEventRingV2).mockResolvedValue({
      score: 45,
      context: {
        windowFrom: new Date("2025-01-01T09:00:00Z"),
        windowTo: new Date("2025-01-01T18:00:00Z"),
        windowKind: "intraday",
        eventCountInWindow: 0,
        notes: ["no_relevant_events"],
        topEvents: [],
      },
    });

    const result = await resolveEventRingForSetup({
      setup,
      asOf: new Date("2025-01-01T10:00:00Z"),
      dataMode: "live",
    });

    expect(result.eventContext?.notes).toContain("no_relevant_events");
    expect(result.eventContext?.notes).not.toContain("hash_fallback");
  });

  it("falls back to hash scoring in mock mode", async () => {
    const setup = {
      ...mockSetups[0],
      eventContext: null,
    };
    const fallbackEvents: BiasEvent[] = [
      {
        id: "evt",
        title: "Mock Event",
        description: "",
        category: "macro",
        severity: "high",
        startTime: new Date().toISOString(),
        endTime: null,
        symbols: [],
        source: "mock",
      },
    ];

    const result = await resolveEventRingForSetup({
      setup,
      asOf: new Date(),
      dataMode: "mock",
      fallbackEvents,
    });

    expect(result.eventScore).toBeGreaterThan(0);
    expect(result.eventContext?.notes).toContain("hash_fallback");
    expect(computeEventRingV2).not.toHaveBeenCalled();
  });

  it("adds db-unavailable note when live fallback triggers", async () => {
    const setup = {
      ...mockSetups[0],
      eventContext: null,
    };
    vi.mocked(computeEventRingV2).mockRejectedValue(new Error("connection refused"));

    const result = await resolveEventRingForSetup({
      setup,
      asOf: new Date(),
      dataMode: "live",
    });

    expect(result.eventContext?.notes).toContain("hash_fallback");
    expect(result.eventContext?.notes).toContain("events_db_unavailable");
  });

  it("marks missing table when live fallback hits table error", async () => {
    const setup = {
      ...mockSetups[0],
      eventContext: null,
    };
    const error = new Error("relation events does not exist");
    (error as { code?: string }).code = "42P01";
    vi.mocked(computeEventRingV2).mockRejectedValue(error);

    const result = await resolveEventRingForSetup({
      setup,
      asOf: new Date(),
      dataMode: "live",
    });

    expect(result.eventContext?.notes).toContain("hash_fallback");
    expect(result.eventContext?.notes).toContain("events_table_missing");
  });
});
