import type { ReactNode } from "react";
import { requireAdminSessionOrRedirect } from "@/src/lib/admin/guards";
import type { Locale } from "@/i18n";
import { AdminLogoutButton } from "@/src/components/admin/AdminLogoutButton";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { AdminSidebar } from "@/src/components/admin/AdminSidebar";

// Admin panel should never be prerendered during build because it depends on live DB/auth.
// Force dynamic rendering to avoid build-time DB connections (e.g. Vercel build export step).
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
  children: ReactNode;
};

export default async function AdminPanelLayout({ params, children }: Props) {
  const resolvedParams = await params;
  const locale = (resolvedParams.locale as Locale | undefined) ?? "en";
  await requireAdminSessionOrRedirect(locale);
  const messages = locale === "de" ? deMessages : enMessages;
  const navItems = [
    { href: `/${locale}/admin`, label: messages["admin.nav.dashboard"] },
    { href: `/${locale}/admin/snapshots`, label: messages["admin.nav.snapshots"] },
    { href: `/${locale}/admin/marketdata`, label: messages["admin.nav.marketdata"] },
    { href: `/${locale}/admin/playbooks`, label: "Playbooks Overview" },
    { href: `/${locale}/admin/playbooks/calibration`, label: "Playbook Calibration" },
    { href: `/${locale}/admin/playbooks/thresholds`, label: "Playbook Thresholds" },
    { href: `/${locale}/admin/outcomes`, label: "Outcomes" },
    { href: `/${locale}/admin/outcomes/overview`, label: "Outcomes Overview" },
    { href: `/${locale}/admin/outcomes/diagnostics`, label: "Outcomes Diagnostics" },
    { href: `/${locale}/admin/outcomes/engine-health`, label: "Engine Health" },
    { href: `/${locale}/admin/monitoring/reports`, label: "Health Reports" },
    { href: `/${locale}/admin/ops`, label: messages["admin.nav.ops"] },
    { href: `/${locale}/admin/system`, label: messages["admin.nav.system"] },
    { href: `/${locale}/admin/system/coverage`, label: "Coverage" },
    { href: `/${locale}/admin/audit`, label: messages["admin.nav.audit"] },
    { href: `/${locale}/admin/events`, label: messages["admin.nav.events"] },
    { href: `/${locale}/admin/assets`, label: messages["admin.nav.assets"] },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900/60 px-4 py-8 lg:flex">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
          <p className="text-lg font-semibold text-slate-100">Perception Lab</p>
        </div>
        <AdminSidebar items={navItems} />
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
