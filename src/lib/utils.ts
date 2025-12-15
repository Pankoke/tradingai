export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMissingTableError(error: unknown, tableHint?: string): boolean {
  if (!error) return false;
  const maybeRecord = error as { code?: string; message?: string; cause?: unknown };

  if (maybeRecord.code === "42P01") {
    return true;
  }
  const nested = maybeRecord.cause as { code?: string } | undefined;
  if (nested?.code === "42P01") {
    return true;
  }
  if (tableHint && typeof maybeRecord.message === "string") {
    const normalized = tableHint.replace(/["']/g, "");
    if (maybeRecord.message.includes(normalized) && maybeRecord.message.includes("does not exist")) {
      return true;
    }
  }
  return false;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}
