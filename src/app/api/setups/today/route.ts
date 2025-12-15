import { NextResponse } from "next/server";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { Setup, PerceptionSnapshot } from "@/src/lib/engine/types";
import { loadLatestSnapshotFromStore } from "@/src/features/perception/cache/snapshotStore";

type TodaySetupsResponse = {
  setups: Setup[];
  setupOfTheDayId: string;
};

type ErrorBody = {
  error: string;
};

export async function GET(): Promise<NextResponse<TodaySetupsResponse | ErrorBody>> {
  try {
    const persisted = await loadLatestSnapshotFromStore();
    if (persisted) {
      const setups = (persisted.setups ?? []) as Setup[];
      const setupOfTheDayId =
        persisted.items.find((item) => item.isSetupOfTheDay)?.setupId ?? setups[0]?.id ?? persisted.snapshot.id;
      return NextResponse.json({
        setups,
        setupOfTheDayId,
      });
    }

    const snapshot: PerceptionSnapshot = await buildPerceptionSnapshot();

    const body: TodaySetupsResponse = {
      setups: snapshot.setups,
      setupOfTheDayId: snapshot.setupOfTheDayId,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("Failed to load setups for today", error);
    return NextResponse.json({ error: "Failed to load setups for today" }, { status: 500 });
  }
}
