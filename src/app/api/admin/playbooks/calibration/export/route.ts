import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { loadCalibrationStats } from "@/src/server/admin/calibrationService";

function isAuthorized(request: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return true;
  const header = request.headers.get("authorization");
  if (!header) return false;
  const value = header.replace("Bearer", "").trim();
  return value === token;
}

export async function GET(request: NextRequest | Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const params =
    "nextUrl" in request && (request as NextRequest).nextUrl
      ? (request as NextRequest).nextUrl.searchParams
      : new URL(request.url).searchParams;
  const playbook = params.get("playbook") ?? "gold-swing-v0.2";
  const profile = params.get("profile") ?? "swing";
  const days = parseInt(params.get("days") ?? "30", 10);
  const assetId = params.get("assetId");
  const format = (params.get("format") ?? "csv").toLowerCase();

  const stats = await loadCalibrationStats({ playbook, profile, days, assetId });
  const rows = stats.recent;

  if (format === "json") {
    return respondOk(rows);
  }

  const header = [
    "timestamp",
    "snapshotId",
    "assetId",
    "symbol",
    "timeframe",
    "profile",
    "direction",
    "setupGrade",
    "setupType",
    "gradeRationale",
    "noTradeReason",
    "gradeDebugReason",
    "trendScore",
    "biasScore",
    "orderflowScore",
    "sentimentScore",
    "confidence",
    "signalQuality",
    "eventModifier",
    "entryZone",
    "stopLoss",
    "takeProfit",
  ];

  const csvLines = [header.join(",")];
  for (const row of rows) {
    const line = [
      quote(row.snapshotCreatedAt ?? ""),
      quote(row.snapshotId ?? ""),
      quote(row.assetId ?? ""),
      quote(row.symbol ?? ""),
      quote(row.timeframe ?? ""),
      quote(row.profile ?? ""),
      quote(row.direction ?? ""),
      quote(row.setupGrade ?? ""),
      quote(row.setupType ?? ""),
      quote((row.gradeRationale ?? []).join("|")),
      quote(row.noTradeReason ?? ""),
      quote((row as { gradeDebugReason?: string }).gradeDebugReason ?? ""),
      num(row.rings?.trendScore),
      num(row.rings?.biasScore),
      num(row.rings?.orderflowScore),
      num(row.rings?.sentimentScore),
      num(row.confidence),
      num((row as { signalQuality?: number }).signalQuality),
      quote(row.eventModifier?.classification ?? ""),
      quote(row.entryZone ?? ""),
      quote(row.stopLoss ?? ""),
      quote(row.takeProfit ?? ""),
    ].join(",");
    csvLines.push(line);
  }

  const body = csvLines.join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=playbook-calibration.csv",
    },
  });
}

function quote(value: string | number | null | undefined): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function num(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toString() : "";
}
