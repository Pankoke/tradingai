import { describe, expect, it } from "vitest";
import { diffPlaybooks } from "@/src/app/[locale]/admin/(panel)/outcomes/overview/lib";

describe("diffPlaybooks", () => {
  it("classifies observed vs missing vs unexpected with registry + classes", () => {
    const expected = [
      "gold-swing-v0.2",
      "energy-swing-v0.1",
      "metals-swing-v0.1",
      "dax-swing-v0.1",
      "spx-swing-v0.1",
      "ndx-swing-v0.1",
      "dow-swing-v0.1",
      "eurusd-swing-v0.1",
      "gbpusd-swing-v0.1",
      "usdjpy-swing-v0.1",
      "eurjpy-swing-v0.1",
      "index-swing-v0.1",
      "fx-swing-v0.1",
      "generic-swing-v0.1",
      "crypto-swing-v0.1",
    ];
    const observed = [
      "gold-swing-v0.2",
      "energy-swing-v0.1",
      "metals-swing-v0.1",
      "dax-swing-v0.1",
      "spx-swing-v0.1",
      "ndx-swing-v0.1",
      "dow-swing-v0.1",
      "eurusd-swing-v0.1",
      "gbpusd-swing-v0.1",
      "usdjpy-swing-v0.1",
      "eurjpy-swing-v0.1",
      "crypto-swing-v0.1",
    ];
    const res = diffPlaybooks(expected, observed);
    expect(res.observed).toEqual(observed.sort());
    expect(res.missing.sort()).toEqual(["fx-swing-v0.1", "generic-swing-v0.1", "index-swing-v0.1"].sort());
    expect(res.unexpected).toEqual([]);
  });
});
