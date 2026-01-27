import { describe, expect, it } from "vitest";
import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";

const goldAssets = [
  { id: "gold", symbol: "GC=F", name: "Gold Futures" },
  { id: "gold", symbol: "XAUUSD", name: "XAUUSD Spot" },
  { id: "metal", symbol: "XAU", name: "Gold Spot" },
  { id: "gold", symbol: "GOLD", name: "Metals" },
  { id: "gc", symbol: "GCZ4", name: "Gold Futures Dec" },
];

describe("Playbook resolver matching for gold swing", () => {
  it("matches gold asset variants and returns gold playbook", () => {
    for (const asset of goldAssets) {
      const { playbook } = resolvePlaybookWithReason(asset, "swing");
      expect(playbook.id).toBe("gold-swing-v0.2");
    }
  });

  it("resolves index, crypto, fx and fallback playbooks", () => {
    const index = resolvePlaybookWithReason({ id: "spx", symbol: "^GSPC", name: "S&P 500" }, "swing");
    expect(index.playbook.id).toBe("spx-swing-v0.1");

    const crypto = resolvePlaybookWithReason({ id: "btc", symbol: "BTCUSDT", name: "Bitcoin" }, "swing");
    expect(crypto.playbook.id).toBe("crypto-swing-v0.1");

    const fx = resolvePlaybookWithReason({ id: "eurusd", symbol: "EURUSD=X", name: "EUR/USD" }, "swing");
    expect(fx.playbook.id).toBe("eurusd-swing-v0.1");

    const fallback = resolvePlaybookWithReason({ id: "custom", symbol: "ABC", name: "Unknown Asset" }, "swing");
    expect(fallback.playbook.id).toBe("generic-swing-v0.1");
  });
});
