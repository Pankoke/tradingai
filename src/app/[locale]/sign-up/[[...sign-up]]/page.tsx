"use client";

import React from "react";
import type { JSX } from "react";
import { SignUp } from "@clerk/nextjs";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

type SignUpPageProps = {
  params: { locale?: string };
};

export default function SignUpPage({ params }: SignUpPageProps): JSX.Element {
  const localeParam = params.locale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--bg-main)] px-4 py-12">
      <SignUp appearance={{}} redirectUrl={`/${locale}/`} afterSignUpUrl={`/${locale}/`} />
    </div>
  );
}
