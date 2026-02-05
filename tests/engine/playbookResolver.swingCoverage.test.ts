import { describe, expect, it } from "vitest";
import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";

const classAssets = [
  { id: "GC=F", symbol: "GC=F", name: "Gold Futures", assetClass: "commodity" },
  { id: "CL=F", symbol: "CL=F", name: "WTI Crude", assetClass: "commodity" },
  { id: "^GSPC", symbol: "^GSPC", name: "S&P 500", assetClass: "index" },
  { id: "^NDX", symbol: "^NDX", name: "NASDAQ 100", assetClass: "index" },
  { id: "^GDAXI", symbol: "^GDAXI", name: "DAX", assetClass: "index" },
  { id: "^DJI", symbol: "^DJI", name: "Dow Jones", assetClass: "index" },
  { id: "BTCUSDT", symbol: "BTCUSDT", name: "Bitcoin", assetClass: "crypto" },
];

describe("Swing playbook resolver coverage", () => {
  it("does not fall back to generic swing for class assets", () => {
    classAssets.forEach((asset) => {
      const { playbook } = resolvePlaybookWithReason(asset);
      expect(playbook.id).not.toBe("generic-swing-v0.1");
    });
  });
});
