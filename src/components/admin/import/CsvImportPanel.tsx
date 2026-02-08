"use client";

import { useMemo, useState } from "react";
import type { ImportRowPreview, ImportSummary } from "@/src/lib/admin/import/types";

type Labels = {
  upload: string;
  dryRun: string;
  preview: string;
  apply: string;
  confirmApply: string;
  errorsFix: string;
  previewMismatch: string;
  sampleHeaders: string;
  summaryRows: string;
  summaryCreates: string;
  summaryUpdates: string;
  summarySkips: string;
  summaryErrors: string;
};

type ImportResponse = {
  ok: true;
  data: {
    summary: ImportSummary;
    rowsPreview?: ImportRowPreview[];
    previewHash?: string;
  };
};

type ErrorResponse = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};

type Props = {
  labels: Labels;
  previewEndpoint: string;
  applyEndpoint: string;
  sampleHeaders: string;
};

export function CsvImportPanel(props: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportResponse["data"] | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);
  const [appliedSummary, setAppliedSummary] = useState<ImportSummary | null>(null);

  const canApply = useMemo(() => {
    return Boolean(preview && preview.previewHash && preview.summary.errors === 0 && confirmApply);
  }, [confirmApply, preview]);

  async function postImport(endpoint: string, mode: "preview" | "apply") {
    if (!file) {
      setError("Please choose a CSV file.");
      return null;
    }
    const body = new FormData();
    body.set("file", file);
    if (mode === "apply" && preview?.previewHash) {
      body.set("previewHash", preview.previewHash);
      body.set("confirmApply", String(confirmApply));
    }
    const res = await fetch(endpoint, {
      method: "POST",
      body,
    });
    const payload = (await res.json()) as ImportResponse | ErrorResponse;
    if (!res.ok || !("ok" in payload) || payload.ok === false) {
      const code = "error" in payload && payload.error?.code ? payload.error.code : "ERROR";
      const message = "error" in payload && payload.error?.message ? payload.error.message : "Request failed";
      throw new Error(`${code}: ${message}`);
    }
    return payload.data;
  }

  async function handlePreview() {
    setBusy("preview");
    setError(null);
    setAppliedSummary(null);
    try {
      const data = await postImport(props.previewEndpoint, "preview");
      if (data) {
        setPreview(data);
        setConfirmApply(false);
      }
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleApply() {
    if (!canApply) return;
    setBusy("apply");
    setError(null);
    try {
      const data = await postImport(props.applyEndpoint, "apply");
      if (data) {
        setAppliedSummary(data.summary);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Apply failed";
      setError(message.includes("PREVIEW_MISMATCH") ? props.labels.previewMismatch : message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="space-y-2">
        <label className="block text-sm text-slate-200">
          {props.labels.upload}
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked readOnly className="h-4 w-4" />
          {props.labels.dryRun}
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={!file || busy !== null}
          className="rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "preview" ? `${props.labels.preview}...` : props.labels.preview}
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply || busy !== null}
          className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50"
        >
          {busy === "apply" ? `${props.labels.apply}...` : props.labels.apply}
        </button>
      </div>

      <div className="space-y-1 text-xs text-slate-400">
        <p>{props.labels.sampleHeaders}</p>
        <code className="block rounded bg-slate-900 px-2 py-1 text-slate-300">{props.sampleHeaders}</code>
      </div>

      {preview ? (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="grid gap-2 text-sm text-slate-200 md:grid-cols-5">
            <p>{props.labels.summaryRows}: {preview.summary.rowsTotal}</p>
            <p>{props.labels.summaryCreates}: {preview.summary.creates}</p>
            <p>{props.labels.summaryUpdates}: {preview.summary.updates}</p>
            <p>{props.labels.summarySkips}: {preview.summary.skips}</p>
            <p>{props.labels.summaryErrors}: {preview.summary.errors}</p>
          </div>
          {preview.summary.errors > 0 ? (
            <p className="text-sm text-amber-300">{props.labels.errorsFix}</p>
          ) : (
            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={confirmApply}
                onChange={(event) => setConfirmApply(event.target.checked)}
                className="h-4 w-4"
              />
              {props.labels.confirmApply}
            </label>
          )}
          {preview.rowsPreview && preview.rowsPreview.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-slate-200">
                <thead className="text-left text-slate-400">
                  <tr>
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">Key</th>
                    <th className="px-2 py-1">Status</th>
                    <th className="px-2 py-1">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rowsPreview.map((row) => (
                    <tr key={`${row.rowIndex}-${row.key}`} className="border-t border-slate-800">
                      <td className="px-2 py-1">{row.rowIndex}</td>
                      <td className="px-2 py-1">{row.key}</td>
                      <td className="px-2 py-1">{row.status}</td>
                      <td className="px-2 py-1">{row.message ?? Object.keys(row.changes ?? {}).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {appliedSummary ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          {props.labels.summaryRows}: {appliedSummary.rowsTotal}, {props.labels.summaryCreates}: {appliedSummary.creates},{" "}
          {props.labels.summaryUpdates}: {appliedSummary.updates}, {props.labels.summarySkips}: {appliedSummary.skips}
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
