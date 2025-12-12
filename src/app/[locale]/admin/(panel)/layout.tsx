import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdminSessionOrRedirect } from "@/src/lib/admin/guards";
import type { Locale } from "@/i18n";
import { AdminLogoutButton } from "@/src/components/admin/AdminLogoutButton";

type Props = {
  params: Promise<{ locale: string }>;
  children: ReactNode;
};

const navItems = [
  { href: (locale: string) => `/${locale}/admin`, label: "Dashboard" },
  { href: (locale: string) => `/${locale}/admin/events`, label: "Events" },
  { href: (locale: string) => `/${locale}/admin/assets`, label: "Assets" },
];

export default async function AdminPanelLayout({ params, children }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  await requireAdminSessionOrRedirect(locale);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900/60 px-4 py-8 lg:flex">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
          <p className="text-lg font-semibold text-slate-100">Perception Lab</p>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href(locale)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AdminLogoutButton locale={locale} />
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-8">
        <div className="lg:hidden mb-4 rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
          Adminbereich ist optimiert für Desktop. Verwende eine breite Ansicht für alle Funktionen.
        </div>
        {children}
      </main>
    </div>
  );
}
