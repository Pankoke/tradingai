import { notFound } from "next/navigation";
import { deleteAssetAction, updateAssetAction } from "@/src/app/[locale]/admin/(panel)/assets/actions";
import { getAssetById } from "@/src/server/repositories/assetRepository";
import type { Locale } from "@/i18n";

type Props = {
  params: { locale: string; id: string };
};

export default async function AdminAssetDetailPage({ params }: Props) {
  const locale = params.locale as Locale;
  const asset = await getAssetById(params.id);
  if (!asset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assets</p>
          <h1 className="text-2xl font-semibold text-white">{asset.name}</h1>
          <p className="text-sm text-slate-400">Bearbeitung</p>
        </div>
        <a href={`/${locale}/admin/assets`} className="text-sm text-sky-300 hover:text-sky-100">
          Zurück
        </a>
      </div>
      <form action={updateAssetAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <input type="hidden" name="id" value={asset.id} />
        <input type="hidden" name="locale" value={locale} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Symbol</span>
            <input
              name="symbol"
              defaultValue={asset.symbol}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Display Symbol</span>
            <input
              name="displaySymbol"
              defaultValue={asset.displaySymbol}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Name</span>
            <input
              name="name"
              defaultValue={asset.name}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Asset-Klasse</span>
            <input
              name="assetClass"
              defaultValue={asset.assetClass}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Basiswährung</span>
            <input
              name="baseCurrency"
              defaultValue={asset.baseCurrency ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Quote-Währung</span>
            <input
              name="quoteCurrency"
              defaultValue={asset.quoteCurrency ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" name="isActive" defaultChecked={Boolean(asset.isActive)} className="h-4 w-4" />
          Aktiv
        </label>
        <div className="flex justify-end">
          <button type="submit" className="rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white">
            Speichern
          </button>
        </div>
      </form>
      <form action={deleteAssetAction}>
        <input type="hidden" name="id" value={asset.id} />
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="rounded-lg border border-rose-500 px-4 py-2 text-sm text-rose-200">
          Asset löschen
        </button>
      </form>
    </div>
  );
}
