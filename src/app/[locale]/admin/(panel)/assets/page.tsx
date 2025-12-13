import Link from "next/link";
import { deleteAssetAction } from "@/src/app/[locale]/admin/(panel)/assets/actions";
import { getAllAssets } from "@/src/server/repositories/assetRepository";
import type { Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminAssetsPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const assets = await getAllAssets();

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assets</p>
          <h1 className="text-3xl font-semibold text-white">Asset-Management</h1>
          <p className="text-sm text-slate-400">Regelbasierte Stammdaten</p>
        </div>
        <Link
          href={`/${locale}/admin/assets/new`}
          className="rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white"
        >
          Neues Asset
        </Link>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Klasse</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-slate-200">
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold">{asset.symbol}</div>
                  <div className="text-xs text-slate-500">{asset.displaySymbol}</div>
                </td>
                <td className="px-4 py-3">{asset.name}</td>
                <td className="px-4 py-3">{asset.assetClass}</td>
                <td className="px-4 py-3">{asset.isActive ? "Aktiv" : "Inaktiv"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/${locale}/admin/assets/${asset.id}`}
                      className="text-xs text-sky-300 hover:text-sky-100"
                    >
                      Bearbeiten
                    </Link>
                    <form action={deleteAssetAction}>
                      <input type="hidden" name="id" value={asset.id} />
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
        {assets.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Keine Assets vorhanden.</p>
        )}
      </div>
    </div>
  );
}
