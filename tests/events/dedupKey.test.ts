import { describe, expect, it } from "vitest";
import { buildDedupKey, normalizeTitle, roundScheduledAt } from "@/src/server/events/ingest/ingestJbNewsCalendar";

describe("dedup helpers", () => {
  it("normalizes whitespace and casing in titles", () => {
    const a = normalizeTitle("  CPI   YoY  ");
    const b = normalizeTitle("cpi yoy");
    expect(a).toBe(b);
  });

  it("dedup key ignores casing and extra punctuation", () => {
    const date = new Date("2025-01-01T10:30:00Z");
    const keyA = buildDedupKey({
      source: "jb-news",
      normalizedTitle: normalizeTitle("CPI  !!!"),
      roundedDate: roundScheduledAt(date),
    });
    const keyB = buildDedupKey({
      source: "jb-news",
      normalizedTitle: normalizeTitle("cpi!"),
      roundedDate: roundScheduledAt(new Date("2025-01-01T10:31:30Z")),
    });
    expect(keyA).toBe(keyB);
  });

  it("rounds scheduled times to 5-minute buckets", () => {
    const rounded = roundScheduledAt(new Date("2025-01-01T10:32:10Z"));
    expect(rounded.toISOString()).toBe("2025-01-01T10:30:00.000Z");
  });

  it("differentiates currency in dedup key", () => {
    const date = new Date("2025-01-01T10:30:00Z");
    const eurKey = buildDedupKey({
      source: "jb-news",
      normalizedTitle: normalizeTitle("GDP"),
      roundedDate: roundScheduledAt(date),
      currency: "EUR",
    });
    const usdKey = buildDedupKey({
      source: "jb-news",
      normalizedTitle: normalizeTitle("GDP"),
      roundedDate: roundScheduledAt(date),
      currency: "USD",
    });
    expect(eurKey).not.toBe(usdKey);
  });

  it("differentiates country in dedup key", () => {
    const date = new Date("2025-01-01T10:30:00Z");
    const usKey = buildDedupKey({
      source: "jb-news",
      normalizedTitle: normalizeTitle("Retail Sales"),
      roundedDate: roundScheduledAt(date),
      country: "US",
    });
    const caKey = buildDedupKey({
      source: "jb-news",
      normalizedTitle: normalizeTitle("Retail Sales"),
      roundedDate: roundScheduledAt(date),
      country: "CA",
    });
    expect(usKey).not.toBe(caKey);
  });
});
