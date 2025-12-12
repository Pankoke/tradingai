import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminLoginForm } from "@/src/components/admin/AdminLoginForm";
import { locales, type Locale } from "@/i18n";

type Props = {
  params: { locale: string };
  searchParams: { redirect?: string };
};

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: `Admin Login – ${params.locale}`,
  };
}

export default function AdminLoginPage({ params, searchParams }: Props) {
  const locale = params.locale as Locale;
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }
  const redirectTo = searchParams.redirect;
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
