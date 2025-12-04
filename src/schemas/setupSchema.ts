import { setupSchema as engineSetupSchema } from "@/src/lib/engine/types";

// API-facing schema keeps core fields but allows engine-specific metadata (assetId, rings, riskReward)
// to be optional so external payloads can validate without full enrichment.
export const setupSchema = engineSetupSchema.partial({
  assetId: true,
  rings: true,
  riskReward: true,
  snapshotId: true,
  snapshotCreatedAt: true,
});

export type SetupSchema = typeof setupSchema;
