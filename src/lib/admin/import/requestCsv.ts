import { NextRequest } from "next/server";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type CsvUploadPayload = {
  csvText: string;
  fileName: string;
  fileBytes: number;
  previewHash?: string;
  confirmApply: boolean;
};

export class CsvUploadError extends Error {
  constructor(
    public readonly code: "BAD_REQUEST" | "PAYLOAD_TOO_LARGE",
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function readFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function readCsvUpload(request: NextRequest): Promise<CsvUploadPayload> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new CsvUploadError("BAD_REQUEST", "Expected multipart/form-data with CSV file", 400);
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    throw new CsvUploadError("BAD_REQUEST", "Missing CSV file", 400);
  }
  if (fileValue.size <= 0) {
    throw new CsvUploadError("BAD_REQUEST", "Empty CSV file", 400);
  }
  if (fileValue.size > MAX_IMPORT_BYTES) {
    throw new CsvUploadError("PAYLOAD_TOO_LARGE", "CSV file exceeds size limit", 413);
  }

  const csvText = await fileValue.text();
  if (!csvText.trim()) {
    throw new CsvUploadError("BAD_REQUEST", "CSV file contains no data", 400);
  }

  return {
    csvText,
    fileName: fileValue.name || "upload.csv",
    fileBytes: fileValue.size,
    previewHash: readFormString(formData, "previewHash"),
    confirmApply: readFormString(formData, "confirmApply") === "true",
  };
}
