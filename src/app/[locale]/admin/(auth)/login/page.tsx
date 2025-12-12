import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminLoginForm } from "@/src/components/admin/AdminLoginForm";
import { locales, type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  return {
    title: `Admin Login – ${resolved.locale}`,
  };
}

export default async function AdminLoginPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }
  const resolvedSearch = await searchParams;
  const redirectTo = resolvedSearch.redirect;
  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold">Perception Lab Admin</h1>
        <p className="text-sm text-slate-400">Kein öffentliches Interface – Zugriff nur mit Passwort.</p>
      </div>
      <AdminLoginForm locale={locale} redirectTo={redirectTo} />
    </div>
  );
}
