import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";
import { applyAssetsImport, previewAssetsImport } from "@/src/lib/admin/import/assetsImport";
import { CsvUploadError, readCsvUpload } from "@/src/lib/admin/import/requestCsv";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  let auth;
  try {
    auth = await requireAdminOrCron(request, { allowCron: false, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  try {
    const upload = await readCsvUpload(request);
    if (!upload.previewHash) {
      return respondFail("BAD_REQUEST", "Missing previewHash", 400);
    }
    if (!upload.confirmApply) {
      return respondFail("BAD_REQUEST", "confirmApply must be true", 400);
    }

    const preview = await previewAssetsImport(upload.csvText);
    if (preview.summary.errors > 0) {
      return respondFail("BAD_REQUEST", "Fix preview errors before apply", 400, preview.summary);
    }

    const applied = await applyAssetsImport({
      csvText: upload.csvText,
      previewHash: upload.previewHash,
    });

    await createAuditRun({
      action: "admin_assets_import_apply",
      source: auth.mode,
      ok: true,
      message: "assets_import_apply_success",
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: {
          format: "csv",
          mode: "apply",
          fileName: upload.fileName,
          fileBytes: upload.fileBytes,
        },
        result: {
          ok: true,
          rows: applied.summary.rowsTotal,
          bytes: upload.fileBytes,
        },
      }),
    });
    return respondOk(applied);
  } catch (error) {
    if (error instanceof CsvUploadError) {
      return respondFail(error.code, error.message, error.status);
    }
    if (error instanceof Error && error.message === "PREVIEW_MISMATCH") {
      return respondFail("PREVIEW_MISMATCH", "Preview hash mismatch. Re-run preview.", 400);
    }
    if (error instanceof Error && error.message === "PREVIEW_HAS_ERRORS") {
      return respondFail("BAD_REQUEST", "Fix preview errors before apply", 400);
    }
    return respondFail("BAD_REQUEST", error instanceof Error ? error.message : "Apply failed", 400);
  }
}
