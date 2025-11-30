import { NextRequest, NextResponse } from "next/server";
import { getPerceptionHistory, type PerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";

type ErrorBody = { error: string };

export async function GET(request: NextRequest): Promise<NextResponse<PerceptionHistoryEntry[] | ErrorBody>> {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(50, Math.max(1, Number(limitParam) || 0)) : 20;

    const history = getPerceptionHistory(limit > 0 ? limit : undefined);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to load perception history", error);
    return NextResponse.json({ error: "Failed to load perception history" }, { status: 500 });
  }
}
