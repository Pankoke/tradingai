import { NextResponse, type NextRequest } from "next/server";
import {
  requestSnapshotBuild,
  SnapshotBuildInProgressError,
  getSnapshotSourceFromNotes,
  getSnapshotBuildStatus,
} from "@/src/server/perception/snapshotBuildService";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";

type ActionSuccess = {
  ok: true;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message: string;
  details?: Record<string, unknown>;
  lastSnapshot: SnapshotInfoPayload | null;
  lockStatus: LockStatusPayload;
};

type ActionError = {
  ok: false;
  errorCode: string;
  message: string;
  lockStatus?: LockStatusPayload;
};

type SnapshotInfoPayload = {
  snapshotId?: string;
  snapshotTime?: string;
  source?: string | null;
  reused?: boolean;
};

type LockStatusPayload = Awaited<ReturnType<typeof getSnapshotBuildStatus>>;

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
  let auth;
  try {
    auth = await requireAdminOrCron(request, { allowCron: true, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return unauthorizedResponse("Missing or invalid admin session");
  }
  if (auth.mode === "admin" && !validateAdminRequestOrigin(request)) {
    return forbiddenResponse("Invalid request origin");
  }

  const body = await request.json().catch(() => ({}));
  const force = Boolean(body?.force);
  const profiles = Array.isArray(body?.profiles) && body.profiles.length ? body.profiles : ["SWING"];

  const startedAt = new Date();
  try {
    const result = await requestSnapshotBuild({ source: "admin", force, profiles, allowSync: false });
    const snapshotWithItems = result.snapshot;
    const snapshot = snapshotWithItems.snapshot;
    const snapshotSource = getSnapshotSourceFromNotes(snapshot.notes) ?? "admin";
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const response: ActionSuccess = {
      ok: true,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      message: result.reused ? `Snapshot bereits aktuell (${snapshot.id})` : `Snapshot ${snapshot.id} erzeugt`,
      details: {
        snapshotId: snapshot.id,
        label: snapshot.label,
        snapshotTime: snapshot.snapshotTime,
        dataMode: snapshot.dataMode,
        setups: Array.isArray(snapshot.setups) ? snapshot.setups.length : undefined,
        reused: result.reused,
        source: snapshotSource,
      },
      lastSnapshot: {
        snapshotId: snapshot.id,
        snapshotTime: snapshot.snapshotTime instanceof Date ? snapshot.snapshotTime.toISOString() : undefined,
        source: snapshotSource,
        reused: result.reused,
      },
      lockStatus: await getSnapshotBuildStatus(),
    };
    await createAuditRun({
      action: "snapshot_build",
      source: auth.mode,
      ok: true,
      durationMs,
      message: response.message,
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: { force, profiles },
        result: { ok: true },
      }),
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof SnapshotBuildInProgressError) {
      await createAuditRun({
        action: "snapshot_build",
        source: auth.mode,
        ok: false,
        durationMs: Date.now() - startedAt.getTime(),
        message: "lock_in_progress",
        meta: buildAuditMeta({
          auth,
          request: { method: request.method, url: request.url },
          params: { force, profiles },
          result: { ok: false },
          error: "lock_in_progress",
        }),
      });
      const body: ActionError = {
        ok: false,
        errorCode: "snapshot_locked",
        message: "Snapshot-Build läuft bereits – bitte warten",
        lockStatus: await getSnapshotBuildStatus(),
      };
      return NextResponse.json(body, { status: 409 });
    }
    console.error("[admin.ops.perception] failed", error);
    await createAuditRun({
      action: "snapshot_build",
      source: auth.mode,
      ok: false,
      durationMs: Date.now() - startedAt.getTime(),
      message: "snapshot_build_failed",
      error: error instanceof Error ? error.message : "unknown error",
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: { force, profiles },
        result: { ok: false },
        error,
      }),
    });
    const body: ActionError = {
      ok: false,
      errorCode: "snapshot_failed",
      message: error instanceof Error ? error.message : "Snapshot failed",
      lockStatus: await getSnapshotBuildStatus(),
    };
    return NextResponse.json(body, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isAdminEnabled()) {
    return disabledResponse();
  }
  let auth;
  try {
    auth = await requireAdminOrCron(request, { allowCron: true, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return unauthorizedResponse("Missing or invalid admin session");
  }
  if (auth.mode === "admin" && !validateAdminRequestOrigin(request)) {
    return forbiddenResponse("Invalid request origin");
  }

  const latest = await getLatestSnapshot();
  const snapshotSource = latest ? getSnapshotSourceFromNotes(latest.snapshot.notes) ?? null : null;
  const payload: ActionSuccess = {
    ok: true,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 0,
    message: "Status",
    lastSnapshot: latest
      ? {
          snapshotId: latest.snapshot.id,
          snapshotTime: latest.snapshot.snapshotTime.toISOString(),
          source: snapshotSource,
          reused: true,
        }
      : null,
    lockStatus: await getSnapshotBuildStatus(),
  };
  return NextResponse.json(payload);
}
