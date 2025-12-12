import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/i18n";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";

function extractLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (maybeLocale && (locales as readonly string[]).includes(maybeLocale)) {
    return maybeLocale;
  }
  return defaultLocale;
}

function isProtectedAdminRoute(pathname: string): boolean {
  if (pathname.startsWith("/api/admin")) {
    return !pathname.startsWith("/api/admin/auth");
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && segments[1] === "admin") {
    if (segments[2] === "login") {
      return false;
    }
    return true;
  }
  return false;
}

export default clerkMiddleware((auth, request) => {
  void auth();
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (!isProtectedAdminRoute(pathname)) {
    return;
  }

  const hasSession = isAdminSessionFromRequest(request);
  if (hasSession) {
    return;
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locale = extractLocale(pathname);
  const loginUrl = new URL(`/${locale}/admin/login`, request.url);
  loginUrl.searchParams.set("redirect", nextUrl.pathname + nextUrl.search);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
