import { createEventAction } from "@/src/app/[locale]/admin/(panel)/events/actions";
import type { Locale } from "@/i18n";

type Props = {
  params: { locale: string };
};

export default function AdminEventCreatePage({ params }: Props) {
  const locale = params.locale as Locale;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Events</p>
        <h1 className="text-2xl font-semibold text-white">Neues Event anlegen</h1>
      </div>
      <form action={createEventAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <input type="hidden" name="locale" value={locale} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Titel</span>
            <input
              name="title"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Kategorie</span>
            <input
              name="category"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Impact (0-100)</span>
            <input
              type="number"
              min={0}
              max={100}
              name="impact"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Quelle</span>
            <input name="source" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label className="space-y-2 text-sm">
            <span>Termin</span>
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Land</span>
            <input name="country" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="space-y-2 text-sm">
          <span>Beschreibung</span>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Betroffene Assets (JSON)</span>
          <textarea
            name="affectedAssets"
            rows={3}
            placeholder='z. B. ["BTC-USD","ETH-USD"]'
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end gap-3">
          <a href={`/${locale}/admin/events`} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">
            Abbrechen
          </a>
          <button type="submit" className="rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white">
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}
