import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { ClientI18nProvider } from "../../lib/i18n/ClientProvider";
import { ClerkRootProvider } from "@/src/components/layout/ClerkRootProvider";
import {
  getSupportedLocales,
  isSupportedLocale,
  loadLocaleMessages,
  resolveLocale,
  type Locale,
} from "@/src/lib/intl";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams(): Array<{ locale: Locale }> {
  return getSupportedLocales().map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: localeParam } = await params;
  if (!localeParam || !isSupportedLocale(localeParam)) {
    notFound();
  }
  const locale = resolveLocale(localeParam);

  const messages = await loadLocaleMessages(locale);

  return (
    <ClientI18nProvider messages={messages}>
      <ClerkRootProvider>
        <div className="flex min-h-screen flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
          <Header />
          <main className="flex-1 bg-[var(--bg-main)]">{children}</main>
          <Footer />
        </div>
      </ClerkRootProvider>
    </ClientI18nProvider>
  );
}
