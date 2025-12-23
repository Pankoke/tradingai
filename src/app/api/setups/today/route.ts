import type { Setup } from "@/src/lib/engine/types";
import { loadLatestSnapshotFromStore, loadLatestSnapshotForProfile } from "@/src/features/perception/cache/snapshotStore";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

type TodaySetupsResponse = {
  setups: Setup[];
  setupOfTheDayId: string;
};

export async function GET(request: Request): Promise<Response> {
  try {
    const profileParam = new URL(request.url).searchParams.get("profile");
    const persistedResult = await loadLatestSnapshotForProfile(profileParam);
    const persisted = persistedResult.snapshot ?? (await loadLatestSnapshotFromStore());
    if (persisted) {
      const setups = (persisted.setups ?? []) as Setup[];
      const setupOfTheDayId =
        persisted.items.find((item) => item.isSetupOfTheDay)?.setupId ?? setups[0]?.id ?? persisted.snapshot.id;
      return respondOk<TodaySetupsResponse>({ setups, setupOfTheDayId });
    }

    return respondOk<TodaySetupsResponse & { meta: Record<string, unknown> }>({
      setups: [],
      setupOfTheDayId: "",
      meta: { snapshotAvailable: false, requestedProfile: profileParam ?? null },
    });
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
