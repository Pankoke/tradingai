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

export function respondOk<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function respondFail(
  code: string,
  message: string,
  status = 500,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    ok: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "ok" in response &&
    (response as ApiErrorResponse).ok === false
  );
}
