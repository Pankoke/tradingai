export type CryptoSwingProfile = {
  trendMin: number;
  confirmationMin: number;
};

export const CRYPTO_SWING_DEFAULT_PROFILE: CryptoSwingProfile = {
  trendMin: 60,
  confirmationMin: 55,
};

export const CRYPTO_SWING_PROFILES_BY_ASSET: Record<string, CryptoSwingProfile> = {
  btc: { trendMin: 55, confirmationMin: 50 },
  eth: { trendMin: 55, confirmationMin: 50 },
};

export function getCryptoSwingProfile(assetId?: string | null): CryptoSwingProfile {
  const key = (assetId ?? "").toLowerCase();
  return CRYPTO_SWING_PROFILES_BY_ASSET[key] ?? CRYPTO_SWING_DEFAULT_PROFILE;
}
