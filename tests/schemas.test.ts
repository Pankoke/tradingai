import { describe, expect, it } from "vitest";
import { setupSchema } from "@/src/schemas/setupSchema";
import {
  biasDirectionEnum,
  biasEntrySchema,
  biasSnapshotSchema,
} from "@/src/schemas/biasSchema";
import { eventCategoryEnum, eventSchema, eventSeverityEnum } from "@/src/schemas/eventsSchema";

describe("setupSchema", () => {
  it("parses a valid setup", () => {
    const validSetup = {
      id: "setup-1",
      symbol: "BTCUSDT",
      timeframe: "H1",
      direction: "Long",
      confidence: 82,
      eventScore: 71,
      biasScore: 68,
      sentimentScore: 64,
      balanceScore: 70,
      entryZone: "64000-64200",
      stopLoss: "63000",
      takeProfit: "67000",
      type: "Regelbasiert",
    };

    const parsed = setupSchema.parse(validSetup);

    expect(parsed).toMatchObject(validSetup);
  });

  it("rejects values outside numeric bounds", () => {
    const invalidSetup: unknown = {
      id: "setup-2",
      symbol: "ETHUSDT",
      timeframe: "H4",
      direction: "Short",
      confidence: 120,
      eventScore: 10,
      biasScore: 20,
      sentimentScore: 30,
      balanceScore: 40,
      entryZone: "3000-3100",
      stopLoss: "3150",
      takeProfit: "2800",
      type: "KI",
    };

    expect(() => setupSchema.parse(invalidSetup)).toThrow();
  });
});

describe("biasSchema", () => {
  it("parses a valid bias snapshot", () => {
    const snapshot = {
      generatedAt: new Date().toISOString(),
      universe: ["BTCUSDT", "ETHUSDT"],
      entries: [
        {
          symbol: "BTCUSDT",
          timeframe: "D1",
          direction: biasDirectionEnum.enum.Bullish,
          confidence: 75,
          comment: "Trend intact",
        },
      ],
      version: "0.1.0",
    };

    const parsed = biasSnapshotSchema.parse(snapshot);

    expect(parsed.entries[0].direction).toBe(biasDirectionEnum.enum.Bullish);
    expect(parsed.universe).toContain("ETHUSDT");
  });

  it("rejects invalid bias direction", () => {
    const invalidEntry: unknown = {
      symbol: "BTCUSDT",
      timeframe: "H1",
      direction: "Sideways",
      confidence: 50,
      comment: "Invalid direction",
    };

    expect(() => biasEntrySchema.parse(invalidEntry)).toThrow();
  });
});

describe("eventsSchema", () => {
  it("parses a valid event", () => {
    const event = {
      id: "evt-1",
      title: "FOMC Statement",
      description: "Rate update",
      category: eventCategoryEnum.enum.macro,
      severity: eventSeverityEnum.enum.high,
      startTime: new Date().toISOString(),
      endTime: null,
      symbols: ["SPX500"],
      source: "calendar",
    };

    const parsed = eventSchema.parse(event);

    expect(parsed.category).toBe(eventCategoryEnum.enum.macro);
    expect(parsed.severity).toBe(eventSeverityEnum.enum.high);
  });

  it("rejects missing required fields", () => {
    const invalidEvent: unknown = {
      id: "evt-2",
      title: "Broken",
      // missing description and category
      severity: "low",
      startTime: new Date().toISOString(),
      endTime: null,
      symbols: [],
      source: "calendar",
    };

    expect(() => eventSchema.parse(invalidEvent)).toThrow();
  });
});
