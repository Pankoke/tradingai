export type Phase0AssetConfig = {
  assetId: string;
  file: string;
  label: string;
};

export const PHASE0_ASSETS: Phase0AssetConfig[] = [
  { assetId: "gold", file: "phase0_gold.json", label: "Gold Swing" },
  { assetId: "btc", file: "phase0_btc.json", label: "BTC Swing" },
  { assetId: "eth", file: "phase0_eth.json", label: "ETH Swing" },
];

/**
 * To add a new asset to the weekly report, append to PHASE0_ASSETS.
 * Ensure the Phase-0 monitor workflow uploads the matching JSON file.
 */
