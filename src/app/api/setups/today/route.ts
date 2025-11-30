import { NextResponse } from "next/server";
import { getPerceptionSnapshot } from "@/src/lib/cache/perceptionCache";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { Setup, PerceptionSnapshot } from "@/src/lib/engine/types";

type TodaySetupsResponse = {
  setups: Setup[];
  setupOfTheDayId: string;
};

type ErrorBody = {
  error: string;
};

export async function GET(): Promise<NextResponse<TodaySetupsResponse | ErrorBody>> {
  try {
    const cached = getPerceptionSnapshot();
    const snapshot: PerceptionSnapshot = cached ?? (await buildPerceptionSnapshot());

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
