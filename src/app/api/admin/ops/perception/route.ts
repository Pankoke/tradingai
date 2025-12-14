import { NextResponse, type NextRequest } from "next/server";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";

type ActionSuccess = {
  ok: true;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message: string;
  details?: Record<string, unknown>;
};

type ActionError = {
  ok: false;
  errorCode: string;
  message: string;
};

function unauthorizedResponse(message: string, status = 401) {
  const body: ActionError = { ok: false, errorCode: "unauthorized", message };
  return NextResponse.json(body, { status });
}

function disabledResponse() {
  const body: ActionError = { ok: false, errorCode: "admin_disabled", message: "Admin operations disabled" };
  return NextResponse.json(body, { status: 404 });
}

function forbiddenResponse(message: string) {
  const body: ActionError = { ok: false, errorCode: "forbidden", message };
  return NextResponse.json(body, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!isAdminEnabled()) {
    return disabledResponse();
  }
  if (!isAdminSessionFromRequest(request)) {
    return unauthorizedResponse("Missing or invalid admin session");
  }
  if (!validateAdminRequestOrigin(request)) {
    return forbiddenResponse("Invalid request origin");
  }

  const startedAt = new Date();
  try {
    const result = await buildAndStorePerceptionSnapshot();
    const snapshot = result.snapshot;
    const finishedAt = new Date();
    const response: ActionSuccess = {
      ok: true,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      message: `Snapshot ${snapshot.id} erzeugt`,
      details: {
        snapshotId: snapshot.id,
        label: snapshot.label,
        snapshotTime: snapshot.snapshotTime,
        dataMode: snapshot.dataMode,
        setups: Array.isArray(snapshot.setups) ? snapshot.setups.length : undefined,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[admin.ops.perception] failed", error);
    const body: ActionError = {
      ok: false,
      errorCode: "snapshot_failed",
      message: error instanceof Error ? error.message : "Snapshot failed",
    };
    return NextResponse.json(body, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, errorCode: "method_not_allowed", message: "Use POST" }, { status: 405 });
}
