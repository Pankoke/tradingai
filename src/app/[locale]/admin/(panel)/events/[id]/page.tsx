import { notFound } from "next/navigation";
import { deleteEventAction, updateEventAction } from "@/src/app/[locale]/admin/(panel)/events/actions";
import { getEventById } from "@/src/server/repositories/eventRepository";
import type { Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function toInputDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 16);
}

export default async function AdminEventDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const event = await getEventById(resolvedParams.id);
  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Events</p>
          <h1 className="text-2xl font-semibold text-white">{event.title}</h1>
          <p className="text-sm text-slate-400">Bearbeitung</p>
        </div>
        <a href={`/${locale}/admin/events`} className="text-sm text-sky-300 hover:text-sky-100">
          Zurück
        </a>
      </div>
      <form action={updateEventAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <input type="hidden" name="id" value={event.id} />
        <input type="hidden" name="locale" value={locale} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Titel</span>
            <input
              name="title"
              defaultValue={event.title}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Kategorie</span>
            <input
              name="category"
              defaultValue={event.category}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Impact</span>
            <input
              name="impact"
              type="number"
              defaultValue={event.impact}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Quelle</span>
            <input
              name="source"
              defaultValue={event.source}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Termin</span>
            <input
              type="datetime-local"
              name="scheduledAt"
              defaultValue={toInputDate(event.scheduledAt)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Land</span>
            <input
              name="country"
              defaultValue={event.country ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="space-y-2 text-sm">
          <span>Beschreibung</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description ?? ""}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Betroffene Assets (JSON)</span>
          <textarea
            name="affectedAssets"
            rows={4}
            defaultValue={event.affectedAssets ? JSON.stringify(event.affectedAssets) : ""}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end">
          <button type="submit" className="rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white">
            Speichern
          </button>
        </div>
      </form>
      <form action={deleteEventAction}>
        <input type="hidden" name="id" value={event.id} />
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="rounded-lg border border-rose-500 px-4 py-2 text-sm text-rose-200">
          Event löschen
        </button>
      </form>
    </div>
  );
}
