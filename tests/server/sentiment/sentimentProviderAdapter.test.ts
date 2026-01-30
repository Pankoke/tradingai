import { describe, expect, it, vi, beforeEach } from "vitest";
import { SentimentProviderAdapter } from "@/src/infrastructure/adapters/sentimentProviderAdapter";

const mockGetAsset = vi.fn();
const mockResolveProvider = vi.fn();

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getAssetById: (...args: unknown[]) => mockGetAsset(...args),
}));

vi.mock("@/src/server/sentiment/providerResolver", () => ({
  resolveSentimentProvider: (...args: unknown[]) => mockResolveProvider(...args),
}));

describe("SentimentProviderAdapter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetAsset.mockResolvedValue({ id: "A", symbol: "AAA", assetClass: "crypto" });
  });

  it("normalizes provider raw to SentimentSnapshotV2 with window and warnings", async () => {
    const asOf = new Date("2024-01-02T12:00:00Z");
    const raw = {
      source: "mock-source",
      timestamp: new Date("2024-01-02T11:30:00Z"),
      polarityScore: 2, // should clamp to 1 in normalizer but overridden by metrics
      confidence: 1.5, // should clamp
    };
    mockResolveProvider.mockReturnValue({
      source: "mock-source",
      fetchSentiment: vi.fn(async () => raw),
    });

    const adapter = new SentimentProviderAdapter();
    const snapshot = await adapter.fetchSentiment({ assetId: "A", asOf });

    expect(snapshot.assetId).toBe("A");
    expect(snapshot.asOfIso).toBe(asOf.toISOString());
    expect(snapshot.window.toIso).toBe(asOf.toISOString());
    expect(snapshot.sources[0].sourceId).toBe("primary");
    expect(snapshot.components.confidence).toBeLessThanOrEqual(1);
    expect(snapshot.meta?.warnings).toBeUndefined(); // no warnings expected for valid data
  });

  it("emits warnings when raw is missing required fields", async () => {
    const asOf = new Date("2024-01-02T12:00:00Z");
    mockResolveProvider.mockReturnValue({
      source: "mock-source",
      fetchSentiment: vi.fn(async () => ({})),
    });

    const adapter = new SentimentProviderAdapter();
    const snapshot = await adapter.fetchSentiment({ assetId: "A", asOf });

    expect(snapshot.sources.length).toBeGreaterThanOrEqual(0);
    const warningsBySource = snapshot.meta?.warningsBySource as Record<string, { warnings: string[] }> | undefined;
    expect(warningsBySource?.primary?.warnings?.length ?? 0).toBeGreaterThan(0);
  });
});
