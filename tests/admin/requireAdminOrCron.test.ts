import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIsAdminSessionFromRequest = vi.fn();

vi.mock("@/src/lib/admin/auth", () => ({
  isAdminSessionFromRequest: (...args: unknown[]) => mockIsAdminSessionFromRequest(...args),
}));

describe("requireAdminOrCron", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsAdminSessionFromRequest.mockReturnValue(false);
    process.env.ADMIN_API_TOKEN = "admin-token";
    process.env.CRON_SECRET = "cron-token";
  });

  it("throws unauthorized with correct details when no admin and no cron", async () => {
    const { requireAdminOrCron } = await import("@/src/lib/admin/auth/requireAdminOrCron");
    const request = new NextRequest("http://localhost/api/admin/outcomes/export");

    await expect(requireAdminOrCron(request)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      details: {
        hasAdmin: false,
        hasCron: false,
        usedAdmin: false,
        usedCron: false,
      },
    });
  });

  it("uses admin mode when admin session is present", async () => {
    mockIsAdminSessionFromRequest.mockReturnValue(true);
    const { requireAdminOrCron } = await import("@/src/lib/admin/auth/requireAdminOrCron");
    const request = new NextRequest("http://localhost/api/admin/outcomes/export");

    const auth = await requireAdminOrCron(request);
    expect(auth.mode).toBe("admin");
    expect(auth.details.usedAdmin).toBe(true);
    expect(auth.details.usedCron).toBe(false);
  });

  it("uses cron mode when cron secret header is present", async () => {
    const { requireAdminOrCron } = await import("@/src/lib/admin/auth/requireAdminOrCron");
    const request = new NextRequest("http://localhost/api/admin/outcomes/export", {
      headers: { "x-cron-secret": "cron-token" },
    });

    const auth = await requireAdminOrCron(request);
    expect(auth.mode).toBe("cron");
    expect(auth.details.usedCron).toBe(true);
    expect(auth.details.usedAdmin).toBe(false);
  });

  it("prefers admin deterministically when both admin and cron are present", async () => {
    mockIsAdminSessionFromRequest.mockReturnValue(true);
    const { requireAdminOrCron } = await import("@/src/lib/admin/auth/requireAdminOrCron");
    const request = new NextRequest("http://localhost/api/admin/outcomes/export", {
      headers: { "x-cron-secret": "cron-token" },
    });

    const auth = await requireAdminOrCron(request);
    expect(auth.mode).toBe("admin");
    expect(auth.details.usedAdmin).toBe(true);
    expect(auth.details.usedCron).toBe(true);
  });
});
