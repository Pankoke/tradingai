import { createAssetAction } from "@/src/app/[locale]/admin/(panel)/assets/actions";
import type { Locale } from "@/i18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: { locale: string };
};

export default function AdminAssetCreatePage({ params }: Props) {
  const locale = params.locale as Locale;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assets</p>
        <h1 className="text-2xl font-semibold text-white">Neues Asset</h1>
      </div>
      <form action={createAssetAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <input type="hidden" name="locale" value={locale} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Symbol</span>
            <input name="symbol" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label className="space-y-2 text-sm">
            <span>Display Symbol</span>
            <input
              name="displaySymbol"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Name</span>
            <input name="name" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label className="space-y-2 text-sm">
            <span>Asset-Klasse</span>
            <input
              name="assetClass"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Basiswährung</span>
            <input name="baseCurrency" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label className="space-y-2 text-sm">
            <span>Quote-Währung</span>
            <input name="quoteCurrency" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 border-slate-600 bg-slate-900" />
          Aktiv
        </label>
        <div className="flex justify-end gap-3">
          <a href={`/${locale}/admin/assets`} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">
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
