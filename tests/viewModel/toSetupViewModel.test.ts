import { describe, expect, test } from "vitest";
import { toSetupViewModel } from "@/src/components/perception/setupViewModel/toSetupViewModel";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";

describe("toSetupViewModel", () => {
  test("normalizes entry/stop/tp from Setup strings with display fallback", () => {
    const setup = {
      id: "s-1",
      assetId: "CL",
      symbol: "CL",
      timeframe: "1D",
      direction: "Long",
      type: "Regelbasiert",
      rings: { eventScore: 80, confidenceScore: 62 },
      entryZone: "100 - 105",
      stopLoss: "95",
      takeProfit: "115-120",
      snapshotCreatedAt: "2024-01-01T10:00:00Z",
    } as unknown as Setup;

    const vm = toSetupViewModel(setup, { generatedAt: "2024-01-02T12:00:00Z" });

    expect(vm.entry.from).toBe(100);
    expect(vm.entry.to).toBe(105);
    expect(vm.entry.display).toBe("100 - 105");
    expect(vm.stop.value).toBe(95);
    expect(vm.stop.display).toBe("95");
    expect(vm.takeProfit.value).toBe(115);
    expect(vm.takeProfit.display).toBe("115-120");
    expect(vm.meta.generatedAt).toBe("2024-01-02T12:00:00Z");
    expect(vm.type).toBe("Regelbasiert");
  });

  test("maps HomepageSetup numerics directly without displays", () => {
    const homepageSetup = {
      id: "h-1",
      assetId: "ES",
      symbol: "ES",
      timeframe: "4H",
      direction: "Short",
      rings: { eventScore: 55, confidenceScore: 48, trendScore: 60, biasScore: 58, sentimentScore: 62, orderflowScore: 50 },
      entryZone: { from: 10.25, to: 12.75 },
      stopLoss: 9.5,
      takeProfit: 15.25,
      snapshotTimestamp: "2024-02-01T00:00:00Z",
      eventLevel: "high",
      weakSignal: true,
    } as unknown as HomepageSetup;

    const vm = toSetupViewModel(homepageSetup);

    expect(vm.entry.from).toBe(10.25);
    expect(vm.entry.to).toBe(12.75);
    expect(vm.entry.display).toBeUndefined();
    expect(vm.stop.value).toBe(9.5);
    expect(vm.takeProfit.value).toBe(15.25);
    expect(vm.meta.eventLevel).toBe("high");
    expect(vm.meta.weakSignal).toBe(true);
    expect(vm.meta.snapshotTime).toBe("2024-02-01T00:00:00Z");
    expect(vm.signalQuality?.score).toBeGreaterThan(0);
    expect(vm.signalQuality?.reasons.length).toBeGreaterThan(0);
    expect(vm.riskReward?.rrr).toBeGreaterThan(0);
  });

  test("gracefully handles missing optional fields", () => {
    const setup = {
      id: "s-2",
      assetId: "NQ",
      symbol: "NQ",
      timeframe: "1H",
      direction: "Short",
      rings: { eventScore: null, confidenceScore: null },
    } as unknown as Setup;

    const vm = toSetupViewModel(setup);

    expect(vm.entry.from).toBeNull();
    expect(vm.entry.to).toBeNull();
    expect(vm.stop.value).toBeNull();
    expect(vm.takeProfit.value).toBeNull();
    expect(vm.meta.eventLevel).toBeNull();
    expect(vm.meta.generatedAt).toBeNull();
  });

  test("computes riskReward from homepage numeric entry/stop/tp", () => {
    const homepageSetup = {
      id: "h-2",
      assetId: "CL",
      symbol: "CL",
      timeframe: "1D",
      direction: "Long",
      rings: { eventScore: 40, confidenceScore: 55, trendScore: 65, biasScore: 63, sentimentScore: 50, orderflowScore: 58 },
      entryZone: { from: 100, to: 110 },
      stopLoss: 90,
      takeProfit: 140,
    } as unknown as HomepageSetup;

    const vm = toSetupViewModel(homepageSetup);

    expect(vm.riskReward).not.toBeNull();
    expect(vm.riskReward?.rrr).toBeGreaterThan(0);
    expect(vm.signalQuality).not.toBeNull();
  });

  test("computes signalQuality for Setup", () => {
    const setup = {
      id: "s-3",
      assetId: "GC",
      symbol: "GC",
      timeframe: "1D",
      direction: "Long",
      rings: { eventScore: 30, confidenceScore: 70, trendScore: 80, biasScore: 78, sentimentScore: 65, orderflowScore: 60 },
    } as unknown as Setup;

    const vm = toSetupViewModel(setup);

    expect(vm.signalQuality).not.toBeNull();
    expect(vm.signalQuality?.score).toBeGreaterThan(0);
    expect(vm.signalQuality?.reasons.length).toBeGreaterThan(0);
  });
});
