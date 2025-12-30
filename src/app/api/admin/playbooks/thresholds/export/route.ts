import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { loadGoldThresholdRecommendations } from "@/src/server/admin/playbookThresholdService";

function isAuthorized(request: Request): boolean {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const cronToken = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const bearer = header?.replace("Bearer", "").trim();
  if (adminToken) {
    return bearer === adminToken || (!!cronToken && bearer === cronToken);
  }
  const env = process.env.NODE_ENV;
  const isLocal = env === "development" || env === "test";
  if (isLocal && !adminToken) return true;
  return !!cronToken && bearer === cronToken;
}

export async function GET(request: NextRequest | Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const params =
    "nextUrl" in request && (request as NextRequest).nextUrl
      ? (request as NextRequest).nextUrl.searchParams
      : new URL(request.url).searchParams;
  const days = parseInt(params.get("days") ?? "90", 10);
  const format = (params.get("format") ?? "csv").toLowerCase();

  const data = await loadGoldThresholdRecommendations({ days });

  if (format === "json") {
    return respondOk(data);
  }

  const header = [
    "metric",
    "current",
    "recommended",
    "delta",
    "samples_closed",
    "winrate_A",
    "winrate_B",
    "winrate_NO_TRADE",
  ];
  const lines = [header.join(",")];
  const metrics = ["biasMin", "trendMin", "signalQualityMin", "orderflowMin"] as const;
  for (const metric of metrics) {
    const line = [
      metric,
      numberCell(data.current[metric]),
      numberCell(data.recommended?.[metric]),
      numberCell(data.deltas?.[metric]),
      numberCell(data.samples.closed),
      winrateCell(data.byGrade["A"]?.winRate),
      winrateCell(data.byGrade["B"]?.winRate),
      winrateCell(data.byGrade["NO_TRADE"]?.winRate),
    ].join(",");
    lines.push(line);
  }

  const body = lines.join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=playbook-thresholds.csv",
    },
  });
}

function numberCell(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function winrateCell(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value * 100)}` : "";
}
