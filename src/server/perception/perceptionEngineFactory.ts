import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";
import { createPerceptionDataSourceFromContainer } from "@/src/server/perception/perceptionDataSourceFactory";
import type { SetupProfile } from "@/src/lib/config/setupProfile";

export async function buildPerceptionSnapshotWithContainer(options?: {
  asOf?: Date;
  allowSync?: boolean;
  profiles?: SetupProfile[];
  assetFilter?: string[];
}): Promise<PerceptionSnapshot> {
  const asOf = options?.asOf ?? new Date();
  const dataSource = createPerceptionDataSourceFromContainer({
    allowSync: options?.allowSync ?? false,
    profiles: options?.profiles,
    assetFilter: options?.assetFilter,
  });

  return buildPerceptionSnapshot({
    ...options,
    asOf,
    dataSource,
  });
}
