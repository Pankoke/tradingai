import { notFound } from "next/navigation";
import { getSnapshotWithItems, getPreviousSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import type { Locale } from "@/i18n";
import type { Setup } from "@/src/lib/engine/types";
import { JsonReveal } from "@/src/components/admin/JsonReveal";
import type { RingKey, SnapshotSetupRankInfo } from "@/src/components/admin/SnapshotSetupCard";
import { SnapshotSetupList } from "@/src/components/admin/SnapshotSetupList";
import { SnapshotDiffPanel } from "@/src/components/admin/SnapshotDiffPanel";
import { diffSnapshots, getSetupMatchKey } from "@/src/server/admin/snapshotDiff";
import type { SnapshotDiffResult } from "@/src/server/admin/snapshotDiff";
import type { SnapshotDiffClientResult } from "@/src/components/admin/SnapshotDiffPanel";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

const ringKeys: RingKey[] = [
  "trendScore",
  "eventScore",
  "biasScore",
  "sentimentScore",
  "orderflowScore",
  "confidenceScore",
];

function formatDate(value: Date | string, locale: Locale): string {
  const formatterLocale = locale === "de" ? "de-DE" : "en-US";
  return new Date(value).toLocaleString(formatterLocale);
}

export default async function AdminSnapshotDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  if (!["de", "en"].includes(locale)) {
    notFound();
  }
  const messages = locale === "de" ? deMessages : enMessages;
  const snapshotData = await getSnapshotWithItems(id);
  if (!snapshotData) {
    notFound();
  }
  const { snapshot, items } = snapshotData;
  const setups: Setup[] = Array.isArray(snapshot.setups) ? (snapshot.setups as Setup[]) : [];
  const currentData = { snapshot, items, setups };
  const previousSnapshotData = await getPreviousSnapshotWithItems(new Date(snapshot.snapshotTime));
  const snapshotDiff: SnapshotDiffResult | null = previousSnapshotData
    ? diffSnapshots({
        current: currentData,
        previous: previousSnapshotData,
      })
    : null;
  const snapshotDiffClient: SnapshotDiffClientResult | null = snapshotDiff
    ? {
        ...snapshotDiff,
        previousSnapshot: {
          ...snapshotDiff.previousSnapshot,
          snapshotTime: new Date(snapshotDiff.previousSnapshot.snapshotTime).toISOString(),
        },
      }
    : null;
  const itemBySetup = new Map(items.map((item) => [item.setupId, item]));

  const ringLabels: Record<RingKey, string> = {
    trendScore: messages["perception.rings.title.trend"],
    eventScore: messages["perception.rings.title.event"],
    biasScore: messages["perception.rings.title.bias"],
    sentimentScore: messages["perception.rings.title.sentiment"],
    orderflowScore: messages["perception.rings.title.orderflow"],
    confidenceScore: messages["perception.rings.title.confidence"],
  };

  const setupMessages = {
    showDetails: messages["admin.snapshots.setup.showDetails"],
    hideDetails: messages["admin.snapshots.setup.hideDetails"],
    confidence: messages["admin.snapshots.setup.confidence"],
    rrr: messages["admin.snapshots.setup.rrr"],
    entry: messages["admin.snapshots.setup.entry"],
    stop: messages["admin.snapshots.setup.stop"],
    target: messages["admin.snapshots.setup.target"],
    rankOverall: messages["admin.snapshotDetail.rankOverall"],
    rankAsset: messages["admin.snapshotDetail.rankAsset"],
    showJson: messages["admin.common.showJson"],
    hideJson: messages["admin.common.hideJson"],
    qualityLabel: messages["admin.snapshots.setup.quality"],
    qualityFallback: messages["admin.snapshots.setup.qualityFallback"],
    qualityScoreLabel: messages["admin.snapshots.setup.qualityScore"],
    notAvailableLabel: messages["admin.common.na"],
  };

  const diffMessages = {
    title: messages["admin.snapshots.diff.title"],
    comparedTo: messages["admin.snapshots.diff.comparedTo"],
    noPrevious: messages["admin.snapshots.diff.noPrevious"],
    sectionAdded: messages["admin.snapshots.diff.added"],
    sectionRemoved: messages["admin.snapshots.diff.removed"],
    sectionChanged: messages["admin.snapshots.diff.changed"],
    none: messages["admin.snapshots.diff.none"],
    more: messages["admin.snapshots.diff.more"],
    qualityLabel: messages["admin.snapshots.diff.quality"],
    topGainers: messages["admin.snapshots.diff.topGainers"],
    topLosers: messages["admin.snapshots.diff.topLosers"],
    significantOnly: messages["admin.snapshots.diff.significantOnly"],
    thresholdHint: messages["admin.snapshots.diff.thresholdHint"],
    jump: messages["admin.snapshots.diff.jump"],
    topRingDeltas: messages["admin.snapshots.diff.topRingDeltas"],
    symbolLabel: messages["admin.marketdata.table.symbol"],
    statusLabel: messages["admin.marketdata.table.status"],
    naLabel: messages["admin.common.na"],
  };

  const listMessages = {
    sortLabel: messages["admin.snapshotDetail.sort.label"],
    sortQualityDesc: messages["admin.snapshotDetail.sort.qualityDesc"],
    sortQualityAsc: messages["admin.snapshotDetail.sort.qualityAsc"],
    sortConfidenceDesc: messages["admin.snapshotDetail.sort.confidenceDesc"],
    sortTrendDesc: messages["admin.snapshotDetail.sort.trendDesc"],
    sortEventDesc: messages["admin.snapshotDetail.sort.eventDesc"],
    sortSymbolAsc: messages["admin.snapshotDetail.sort.symbolAsc"],
    expandAll: messages["admin.snapshotDetail.expandAll"],
    collapseAll: messages["admin.snapshotDetail.collapseAll"],
    summary: messages["admin.snapshotDetail.setups.summary"],
  };

  const ringDeltaLabelMap = {
    trend: ringLabels.trendScore,
    event: ringLabels.eventScore,
    bias: ringLabels.biasScore,
    sentiment: ringLabels.sentimentScore,
    orderflow: ringLabels.orderflowScore,
    confidence: ringLabels.confidenceScore,
  };

  const setupEntries = setups.map((setup) => {
    const item = itemBySetup.get(setup.id);
    const rank: SnapshotSetupRankInfo | undefined = item
      ? {
          overall: item.rankOverall,
          asset: item.rankWithinAsset,
        }
      : undefined;
    return {
      setup,
      rank,
      matchKey: getSetupMatchKey(setup),
    };
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          {messages["admin.snapshotDetail.title"]}
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">{snapshot.label ?? snapshot.id}</h1>
            <p className="text-sm text-slate-400">{formatDate(snapshot.snapshotTime, locale as Locale)}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="rounded-lg border border-slate-700/70 px-3 py-1">
              {messages["admin.snapshotDetail.meta.dataMode"]}: {snapshot.dataMode}
            </span>
            {typeof snapshot.generatedMs === "number" && (
              <span className="rounded-lg border border-slate-700/70 px-3 py-1">
                {messages["admin.snapshotDetail.meta.generated"]}: {snapshot.generatedMs} ms
              </span>
            )}
            <span className="rounded-lg border border-slate-700/70 px-3 py-1">
              {messages["admin.snapshotDetail.meta.setups"]}: {setups.length}
            </span>
            <span className="rounded-lg border border-slate-700/70 px-3 py-1">
              {messages["admin.snapshotDetail.meta.items"]}: {items.length}
            </span>
          </div>
        </div>
        <JsonReveal
          data={snapshot}
          showLabel={messages["admin.common.showJson"]}
          hideLabel={messages["admin.common.hideJson"]}
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">
            {messages["admin.snapshotDetail.setups.heading"]}
          </h2>
          <span className="text-sm text-slate-400">
            {messages["admin.snapshotDetail.meta.setups"]}: {setups.length}
          </span>
        </div>
        {setups.length === 0 ? (
          <p className="text-sm text-slate-400">{messages["admin.snapshotDetail.setups.empty"]}</p>
        ) : (
          <SnapshotSetupList
            setups={setupEntries}
            ringLabels={ringLabels}
            setupMessages={setupMessages}
            listMessages={listMessages}
          />
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <SnapshotDiffPanel
          diff={snapshotDiffClient}
          locale={locale as Locale}
          messages={diffMessages}
          ringDeltaLabelMap={ringDeltaLabelMap}
        />
      </section>
    </div>
  );
}
