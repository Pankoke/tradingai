import { NextResponse } from "next/server";

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

const DEFAULT_STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function respondOk<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function respondFail(
  code: string,
  message: string,
  status?: number,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  const resolvedStatus = status ?? DEFAULT_STATUS_BY_CODE[code] ?? 500;
  const safeDetails =
    details === undefined || details === null
      ? undefined
      : typeof details === "string" || Array.isArray(details) || typeof details === "object"
        ? details
        : String(details);
  const body: ApiErrorResponse = {
    ok: false,
    error: {
      code,
      message,
      ...(safeDetails !== undefined ? { details: safeDetails } : {}),
    },
  };
  return NextResponse.json(body, { status: resolvedStatus });
}

export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "ok" in response &&
    (response as ApiErrorResponse).ok === false
  );
}
