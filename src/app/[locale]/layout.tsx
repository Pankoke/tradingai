import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { ClientI18nProvider } from "../../lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "../../lib/i18n/config";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams(): Array<{ locale: Locale }> {
  return i18nConfig.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;

  if (!i18nConfig.locales.includes(locale)) {
    notFound();
  }

  const messages = (await import(`../../messages/${locale}.json`)).default as Record<string, string>;

  return (
    <ClientI18nProvider messages={messages}>
      <div className="flex min-h-screen flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
        <Header />
        <main className="flex-1 bg-[var(--bg-main)]">{children}</main>
        <Footer />
      </div>
    </ClientI18nProvider>
  );
}
