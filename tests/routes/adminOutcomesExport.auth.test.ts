import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/src/app/api/admin/outcomes/export/route";

vi.mock("@/src/server/admin/outcomeService", () => ({
  loadOutcomeExportRows: vi.fn(async () => []),
}));

describe("admin outcomes export auth", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test", ADMIN_API_TOKEN: "", CRON_SECRET: "cron123" };
  });

  it("allows CRON_SECRET bearer", async () => {
    const res = await GET(
      new Request("http://localhost/api/admin/outcomes/export", {
        headers: { authorization: "Bearer cron123" },
      }),
    );
    expect(res.status).toBe(200);
  });
});
