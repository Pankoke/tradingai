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

  it("keeps default playbook for non-gold assets", () => {
    const { playbook } = resolvePlaybookWithReason({ id: "spx", symbol: "^GSPC", name: "S&P 500" }, "swing");
    expect(playbook.id).toBe("default");
  });
});
