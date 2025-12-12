import Link from "next/link";
import { deleteEventAction } from "@/src/app/[locale]/admin/(panel)/events/actions";
import { listRecentEvents } from "@/src/server/repositories/eventRepository";
import type { Locale } from "@/i18n";

type Props = {
  params: { locale: string };
};

export default async function AdminEventsPage({ params }: Props) {
  const locale = params.locale as Locale;
  const events = await listRecentEvents(50);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Events</p>
          <h1 className="text-3xl font-semibold text-white">Event-Management</h1>
          <p className="text-sm text-slate-400">Letzte 50 Events, sortiert nach Termin.</p>
        </div>
        <Link
          href={`/${locale}/admin/events/new`}
          className="rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
        >
          Neues Event
        </Link>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Impact</th>
              <th className="px-4 py-3">Kategorie</th>
              <th className="px-4 py-3">Termin</th>
              <th className="px-4 py-3">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-slate-200">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-xs text-slate-500">{event.source}</div>
                </td>
                <td className="px-4 py-3">{event.impact}</td>
                <td className="px-4 py-3">{event.category}</td>
                <td className="px-4 py-3">
                  {new Date(event.scheduledAt).toLocaleString(locale === "de" ? "de-DE" : "en-US")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/${locale}/admin/events/${event.id}`}
                      className="text-xs text-sky-300 hover:text-sky-100"
                    >
                      Bearbeiten
                    </Link>
                    <form action={deleteEventAction}>
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="text-xs text-rose-300 hover:text-rose-100">
                        Löschen
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Keine Events vorhanden.</p>
        )}
      </div>
    </div>
  );
}
