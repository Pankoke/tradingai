import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";
import { getSnapshotByTime } from "@/src/server/repositories/perceptionSnapshotRepository";

function isAuthorized(request: Request): boolean {
  const token = process.env.CRON_SECRET;
  if (!token) return true;
  const header = request.headers.get("authorization");
  if (!header) return false;
  const value = header.replace("Bearer", "").trim();
  return value === token;
}

export async function POST(request: NextRequest | Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const params =
    "nextUrl" in request && (request as NextRequest).nextUrl
      ? (request as NextRequest).nextUrl.searchParams
      : new URL(request.url).searchParams;
  const days = parseInt(params.get("days") ?? "30", 10);
  const today = new Date();
  let built = 0;
  let skipped = 0;
  for (let i = days; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    date.setUTCDate(date.getUTCDate() - i);
    const existing = await getSnapshotByTime({ snapshotTime: date });
    if (existing) {
      skipped += 1;
      continue;
    }
    await buildAndStorePerceptionSnapshot({
      snapshotTime: date,
      allowSync: false,
      profiles: ["SWING"],
      source: "cron",
    });
    built += 1;
  }

  return respondOk({ built, skipped });
}
