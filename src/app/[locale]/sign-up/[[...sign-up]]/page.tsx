"use client";

import React from "react";
import type { JSX } from "react";
import { SignUp } from "@clerk/nextjs";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { clerkAppearance } from "@/src/lib/auth/clerkAppearance";

type SignUpPageProps = {
  params: { locale?: string };
};

export default function SignUpPage({ params }: SignUpPageProps): JSX.Element {
  const localeParam = params.locale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center bg-[var(--bg-main)] px-4 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(34,197,94,0.08),transparent_30%)] pointer-events-none" />
      <div className="relative w-full max-w-xl">
        <SignUp appearance={clerkAppearance} redirectUrl={`/${locale}/`} afterSignUpUrl={`/${locale}/`} />
      </div>
    </div>
  );
}
