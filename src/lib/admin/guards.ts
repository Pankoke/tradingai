import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminSessionFromCookies } from "@/src/lib/admin/auth";
import { defaultLocale } from "@/i18n";

export class AdminAuthError extends Error {
  constructor(message = "Admin authentication required") {
    super(message);
    this.name = "AdminAuthError";
  }
}

async function hasSession(): Promise<boolean> {
  const cookiesStore = await cookies();
  return isAdminSessionFromCookies(cookiesStore);
}

export async function ensureAdminSession(): Promise<void> {
  if (!(await hasSession())) {
    throw new AdminAuthError();
  }
}

export async function requireAdminSessionOrRedirect(locale?: string): Promise<void> {
  if (await hasSession()) {
    return;
  }
  redirect(`/${locale ?? defaultLocale}/admin/login`);
}
