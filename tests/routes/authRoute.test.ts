import { describe, expect, it } from "vitest";
import { GET } from "@/src/app/api/auth/route";

describe("/api/auth route", () => {
  it("returns unauthenticated contract", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload).toEqual({
      ok: true,
      data: {
        authenticated: false,
        user: null,
        role: null,
        version: expect.any(String),
        timestamp: expect.any(String),
      },
    });
  });
});
