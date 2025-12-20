import { describe, expect, it } from "vitest";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

describe("apiResponse helpers", () => {
  it("respondOk returns 200 JSON with ok/data", async () => {
    const response = respondOk({ foo: "bar" }, 201);
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toEqual({ ok: true, data: { foo: "bar" } });
  });

  it("respondFail returns error details", async () => {
    const response = respondFail("TEST_ERROR", "Test failure", 400, { info: 42 });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "TEST_ERROR",
        message: "Test failure",
        details: { info: 42 },
      },
    });
  });

  it("maps common error codes to default statuses", async () => {
    const res = respondFail("VALIDATION_ERROR", "bad input");
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });
});
