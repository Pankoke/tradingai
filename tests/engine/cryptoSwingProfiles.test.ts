import { describe, expect, it } from "vitest";
import {
  CRYPTO_SWING_DEFAULT_PROFILE,
  getCryptoSwingProfile,
} from "@/src/lib/engine/playbooks/profiles/cryptoSwingProfiles";

describe("crypto swing profiles", () => {
  it("returns asset-specific profile for eth", () => {
    const profile = getCryptoSwingProfile("eth");
    expect(profile.trendMin).toBe(55);
    expect(profile.confirmationMin).toBe(50);
  });

  it("falls back to default profile for unknown assets", () => {
    const profile = getCryptoSwingProfile("sol");
    expect(profile).toEqual(CRYPTO_SWING_DEFAULT_PROFILE);
  });
});
