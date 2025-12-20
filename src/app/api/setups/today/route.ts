import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { PerceptionSnapshot, Setup } from "@/src/lib/engine/types";
import { loadLatestSnapshotFromStore } from "@/src/features/perception/cache/snapshotStore";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

type TodaySetupsResponse = {
  setups: Setup[];
  setupOfTheDayId: string;
};

export async function GET(): Promise<Response> {
  try {
    const persisted = await loadLatestSnapshotFromStore();
    if (persisted) {
      const setups = (persisted.setups ?? []) as Setup[];
      const setupOfTheDayId =
        persisted.items.find((item) => item.isSetupOfTheDay)?.setupId ?? setups[0]?.id ?? persisted.snapshot.id;
      return respondOk<TodaySetupsResponse>({ setups, setupOfTheDayId });
    }

    const snapshot: PerceptionSnapshot = await buildPerceptionSnapshot();

    const body: TodaySetupsResponse = {
      setups: snapshot.setups,
      setupOfTheDayId: snapshot.setupOfTheDayId,
    };

    return respondOk(body);
  } catch (error) {
    console.error("Failed to load setups for today", error);
    return respondFail(
      "INTERNAL_ERROR",
      "Failed to load setups for today",
      500,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}
