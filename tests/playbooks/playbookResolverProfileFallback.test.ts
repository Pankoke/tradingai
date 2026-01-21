import { describe, expect, it } from "vitest";

import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";

const makeAsset = (id: string, symbol?: string) => ({
  id,
  symbol: symbol ?? id,
  name: id.toUpperCase(),
});

describe("playbook resolver profile handling", () => {
  it("keeps FX swing playbooks even when profile is empty or generic position", () => {
    const asset = makeAsset("eurusd", "EURUSD");

    const resolvedEmptyProfile = resolvePlaybookWithReason(asset, "");
    expect(resolvedEmptyProfile.playbook.id).toBe("eurusd-swing-v0.1");

    const resolvedPositionProfile = resolvePlaybookWithReason(asset, "position");
    expect(resolvedPositionProfile.playbook.id).toBe("eurusd-swing-v0.1");
  });

  it("routes explicitly non-swing profiles to generic swing", () => {
    const asset = makeAsset("gold", "GOLD");

    const resolvedIntraday = resolvePlaybookWithReason(asset, "intraday");
    expect(resolvedIntraday.playbook.id).toBe("generic-swing-v0.1");
    expect(resolvedIntraday.reason).toBe("non-swing profile");
  });
});
