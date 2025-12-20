import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";

type PerceptionRoutePayload = {
  hasSnapshot: boolean;
  latestSnapshotTime?: string | null;
  version?: string | null;
  itemCount?: number | null;
};

export async function GET(): Promise<Response> {
  try {
    const latest = await getLatestSnapshot();
    if (!latest) {
      return respondOk<PerceptionRoutePayload>({
        hasSnapshot: false,
      });
    }
    const snapshotTime = latest.snapshot.snapshotTime?.toISOString() ?? null;
    return respondOk<PerceptionRoutePayload>({
      hasSnapshot: true,
      latestSnapshotTime: snapshotTime,
      version: latest.snapshot.version ?? null,
      itemCount: latest.items.length,
    });
  } catch (error) {
    return respondFail(
      "perception.snapshot.fetch_failed",
      "Failed to load the latest perception snapshot",
      500,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}
