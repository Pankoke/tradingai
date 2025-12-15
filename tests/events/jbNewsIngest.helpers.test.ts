import { describe, expect, it } from "vitest";
import {
  buildDedupKey,
  normalizeTitle,
  roundScheduledAt,
} from "@/src/server/events/ingest/ingestJbNewsCalendar";

describe("jb-news ingest helpers", () => {
  it("normalizes titles by trimming, collapsing whitespace, and deduping punctuation", () => {
    const normalized = normalizeTitle("  GDP   -- Release!!   ");
    expect(normalized).toBe("gdp - release!");
  });

  it("rounds scheduled date to the nearest five minutes", () => {
    const rounded = roundScheduledAt(new Date("2024-05-05T10:03:20.000Z"));
    expect(rounded.toISOString()).toBe("2024-05-05T10:05:00.000Z");

    const roundedDown = roundScheduledAt(new Date("2024-05-05T10:02:10.000Z"));
    expect(roundedDown.toISOString()).toBe("2024-05-05T10:00:00.000Z");
  });

  it("builds the same dedup key for slightly different representations", () => {
    const keyA = buildDedupKey({
      source: "jb-news",
      normalizedTitle: normalizeTitle("US GDP Flash Release"),
      roundedDate: roundScheduledAt(new Date("2024-05-05T12:02:30.000Z")),
      currency: "USD",
      country: "US",
    });
    const keyB = buildDedupKey({
      source: "jb-news",
      normalizedTitle: normalizeTitle("  us  gdp flash   release  "),
      roundedDate: roundScheduledAt(new Date("2024-05-05T12:04:10.000Z")),
      currency: "usd",
      country: "us",
    });
    expect(keyA).toBe(keyB);
  });
});
