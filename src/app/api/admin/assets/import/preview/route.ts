import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";
import { previewAssetsImport } from "@/src/lib/admin/import/assetsImport";
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
    const preview = await previewAssetsImport(upload.csvText);
    await createAuditRun({
      action: "admin_assets_import_preview",
      source: auth.mode,
      ok: true,
      message: "assets_import_preview_success",
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: {
          format: "csv",
          mode: "preview",
          fileName: upload.fileName,
          fileBytes: upload.fileBytes,
        },
        result: {
          ok: true,
          rows: preview.summary.rowsTotal,
          bytes: upload.fileBytes,
        },
      }),
    });
    return respondOk(preview);
  } catch (error) {
    if (error instanceof CsvUploadError) {
      return respondFail(error.code, error.message, error.status);
    }
    return respondFail("BAD_REQUEST", error instanceof Error ? error.message : "Preview failed", 400);
  }
}
