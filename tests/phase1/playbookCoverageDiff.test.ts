import { describe, expect, it } from "vitest";
import { diffPlaybooks } from "@/src/app/[locale]/admin/(panel)/outcomes/overview/lib";

describe("diffPlaybooks", () => {
  it("classifies observed vs missing vs unexpected", () => {
    const expected = ["gold-swing-v0.2", "energy-swing-v0.1", "metals-swing-v0.1"];
    const observed = ["energy-swing-v0.1", "metals-swing-v0.1", "legacy-v0.1"];
    const res = diffPlaybooks(expected, observed);
    expect(res.observed).toEqual(["energy-swing-v0.1", "legacy-v0.1", "metals-swing-v0.1"]);
    expect(res.missing).toEqual(["gold-swing-v0.2"]);
    expect(res.unexpected).toEqual(["legacy-v0.1"]);
  });
});

