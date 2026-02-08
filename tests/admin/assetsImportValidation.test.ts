import { beforeEach, describe, expect, it, vi } from "vitest";
import { previewAssetsImport } from "@/src/lib/admin/import/assetsImport";

const mockGetAssetsByIds = vi.fn();
const mockGetAssetsBySymbols = vi.fn();

vi.mock("@/src/server/repositories/assetRepository", async () => {
  const actual = await vi.importActual("@/src/server/repositories/assetRepository");
  return {
    ...actual,
    getAssetsByAssetIds: (...args: unknown[]) => mockGetAssetsByIds(...args),
    getAssetsBySymbols: (...args: unknown[]) => mockGetAssetsBySymbols(...args),
  };
});

describe("previewAssetsImport", () => {
  beforeEach(() => {
    mockGetAssetsByIds.mockResolvedValue([]);
    mockGetAssetsBySymbols.mockResolvedValue([
      {
        id: "gold",
        symbol: "XAUUSD",
        displaySymbol: "XAU/USD",
        name: "Gold",
        assetClass: "commodity",
        baseCurrency: "XAU",
        quoteCurrency: "USD",
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
  });

  it("classifies create/update/skip/error and ignored columns", async () => {
    const csv = [
      "assetId,symbol,name,assetClass,status,unknownCol",
      "new1,ETHUSDT,Ether,crypto,active,x",
      ",XAUUSD,Gold,commodity,active,x",
      ",,,commodity,active,x",
    ].join("\n");

    const result = await previewAssetsImport(csv);
    expect(result.summary.rowsTotal).toBe(3);
    expect(result.summary.creates).toBe(1);
    expect(result.summary.skips + result.summary.updates).toBeGreaterThanOrEqual(1);
    expect(result.summary.errors).toBe(1);
    expect(result.summary.ignoredColumns).toContain("unknownCol");
  });
});
