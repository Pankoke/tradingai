import { OpsActionsPanel } from "@/src/components/admin/OpsActionsPanel";
import type { LockStatusState } from "@/src/components/admin/OpsActionsPanel";
import { EventsIngestionPanel } from "@/src/components/admin/EventsIngestionPanel";
import type { EventsIngestionRunInfo } from "@/src/components/admin/EventsIngestionPanel";
import { EventsEnrichmentPanel } from "@/src/components/admin/EventsEnrichmentPanel";
import type {
  EventsEnrichmentRunInfo,
  EventsEnrichmentStats,
} from "@/src/components/admin/EventsEnrichmentPanel";
import { EventsDedupPanel } from "@/src/components/admin/EventsDedupPanel";
import type { EventsDedupRunInfo } from "@/src/components/admin/EventsDedupPanel";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";
import { listAuditRuns } from "@/src/server/repositories/auditRunRepository";
import { getEventEnrichmentStats } from "@/src/server/repositories/eventRepository";
import {
  getSnapshotSourceFromNotes,
  getSnapshotBuildStatus,
} from "@/src/server/perception/snapshotBuildService";
import type { SnapshotBuildSource } from "@/src/features/perception/build/buildSetups";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { buildOpsGovernanceRelatedLinks } from "@/src/components/admin/relatedLinks";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOpsPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const [latestSnapshot, rawLockStatus, eventsAudit, enrichmentAudit, enrichmentStats, dedupAudit] = await Promise.all([
    getLatestSnapshot(),
    getSnapshotBuildStatus(),
    listAuditRuns({ filters: { action: "events.ingest" }, limit: 1 }),
    listAuditRuns({ filters: { action: "events.enrich" }, limit: 1 }),
    getEventEnrichmentStats(),
    listAuditRuns({ filters: { action: "events.dedup_sweep" }, limit: 1 }),
  ]);
  const latestSnapshotInfo = latestSnapshot
    ? {
        snapshotId: latestSnapshot.snapshot.id,
        snapshotTime: latestSnapshot.snapshot.snapshotTime.toISOString(),
        source: (getSnapshotSourceFromNotes(latestSnapshot.snapshot.notes) ?? "unknown") as
          | SnapshotBuildSource
          | "unknown",
      }
    : null;
  const lockStatus: LockStatusState = rawLockStatus
    ? {
        locked: rawLockStatus.locked,
        source: rawLockStatus.source ?? undefined,
        startedAt: rawLockStatus.startedAt,
        expiresAt: rawLockStatus.expiresAt,
        remainingMs: rawLockStatus.remainingMs,
        state: rawLockStatus.state
          ? {
              status: rawLockStatus.state.status,
              source: rawLockStatus.state.source as SnapshotBuildSource | undefined,
              startedAt: rawLockStatus.state.startedAt,
              finishedAt: rawLockStatus.state.finishedAt,
              error: rawLockStatus.state.error ?? null,
              reused: rawLockStatus.state.reused,
            }
          : undefined,
      }
    : { locked: false };

  const opsMessages = {
    title: messages["admin.ops.title"],
    description: messages["admin.ops.description"],
    disabledLabel: messages["admin.ops.disabledInProd"],
    perception: {
      title: messages["admin.ops.perception.title"],
      description: messages["admin.ops.perception.description"],
      button: messages["admin.ops.perception.button"],
      lastSourceLabel: messages["admin.ops.perception.lastSourceLabel"],
      snapshotTimeLabel: messages["admin.ops.perception.snapshotTimeLabel"],
      sources: {
        admin: messages["admin.ops.perception.source.admin"],
        ui: messages["admin.ops.perception.source.ui"],
        cron: messages["admin.ops.perception.source.cron"],
        cron_intraday: messages["admin.ops.perception.source.cron"],
        unknown: messages["admin.ops.perception.source.unknown"],
      },
      forceLabel: messages["admin.ops.perception.forceLabel"],
      buildRunning: messages["admin.ops.perception.buildRunning"],
      locked: messages["admin.ops.perception.locked"],
      unlocked: messages["admin.ops.perception.unlocked"],
      lockSourceLabel: messages["admin.ops.perception.lockSourceLabel"],
      lockSinceLabel: messages["admin.ops.perception.lockSinceLabel"],
      lockEtaLabel: messages["admin.ops.perception.lockEtaLabel"],
      forceConfirm: {
        title: messages["admin.ops.perception.forceConfirm.title"],
        body: messages["admin.ops.perception.forceConfirm.body"],
        cancel: messages["admin.ops.perception.forceConfirm.cancel"],
        confirm: messages["admin.ops.perception.forceConfirm.confirm"],
      },
    },
    marketdata: {
      title: messages["admin.ops.marketdata.title"],
      description: messages["admin.ops.marketdata.description"],
      button: messages["admin.ops.marketdata.button"],
      symbolLabel: messages["admin.ops.marketdata.symbolLabel"],
      symbolPlaceholder: messages["admin.ops.marketdata.symbolPlaceholder"],
      runAllLabel: messages["admin.ops.marketdata.runAllLabel"],
    },
    bias: {
      title: messages["admin.ops.bias.title"],
      description: messages["admin.ops.bias.description"],
      button: messages["admin.ops.bias.button"],
    },
    status: {
      idle: messages["admin.ops.status.idle"],
      running: messages["admin.ops.status.running"],
      success: messages["admin.ops.status.success"],
      error: messages["admin.ops.status.error"],
      lastRun: messages["admin.ops.status.lastRun"],
      duration: messages["admin.ops.status.duration"],
      output: messages["admin.ops.status.output"],
      none: messages["admin.ops.status.none"],
    },
    common: {
      showDetails: messages["admin.common.showJson"],
      hideDetails: messages["admin.common.hideJson"],
      refresh: messages["admin.ops.common.refresh"],
    },
    eventsIngestion: {
      title: messages["admin.eventsIngestion.title"],
      description: messages["admin.eventsIngestion.description"],
      button: messages["admin.eventsIngestion.button"],
      rollingWindowLabel: messages["admin.eventsIngestion.rollingWindowLabel"],
      rollingWindowValue: messages["admin.eventsIngestion.rollingWindowValue"],
      sourceLabel: messages["admin.eventsIngestion.sourceLabel"],
      sourceValue: messages["admin.eventsIngestion.sourceValue"],
      lastRunLabel: messages["admin.eventsIngestion.lastRun"],
      noRuns: messages["admin.eventsIngestion.noRuns"],
      statusSuccess: messages["admin.eventsIngestion.status.success"],
      statusFailed: messages["admin.eventsIngestion.status.failed"],
      countsLabel: messages["admin.eventsIngestion.counts"],
      retentionLabel: messages["admin.eventsIngestion.retention"],
      deletedLabel: messages["admin.eventsIngestion.deleted"],
      runAtLabel: messages["admin.eventsIngestion.runAt"],
      errorLabel: messages["admin.eventsIngestion.error"],
      resultLabel: messages["admin.eventsIngestion.result"],
    },
    eventsEnrichment: {
      title: messages["admin.eventsEnrichment.title"],
      description: messages["admin.eventsEnrichment.description"],
      enabledLabel: messages["admin.eventsEnrichment.enabledLabel"],
      limitLabel: messages["admin.eventsEnrichment.limitLabel"],
      candidatesLabel: messages["admin.eventsEnrichment.candidatesLabel"],
      coverageLabel: messages["admin.eventsEnrichment.coverageLabel"],
      fallbackLabel: messages["admin.eventsEnrichment.fallbackLabel"],
      lastEnrichedLabel: messages["admin.eventsEnrichment.lastEnrichedLabel"],
      lastRunLabel: messages["admin.eventsEnrichment.lastRunLabel"],
      noRuns: messages["admin.eventsEnrichment.noRuns"],
      statusSuccess: messages["admin.eventsEnrichment.status.success"],
      statusFailed: messages["admin.eventsEnrichment.status.failed"],
      countsLabel: messages["admin.eventsEnrichment.countsLabel"],
      retriesLabel: messages["admin.eventsEnrichment.retriesLabel"],
      skippedLowValueLabel: messages["admin.eventsEnrichment.skippedLowValueLabel"],
      skippedAlreadyLabel: messages["admin.eventsEnrichment.skippedAlreadyLabel"],
      configEnabledLabel: messages["admin.eventsEnrichment.enabledLabel"],
      configLimitLabel: messages["admin.eventsEnrichment.limitLabel"],
      runAtLabel: messages["admin.eventsEnrichment.runAtLabel"],
      button: messages["admin.eventsEnrichment.button"],
      disabledNote: messages["admin.eventsEnrichment.disabledNote"],
      resultLabel: messages["admin.eventsEnrichment.resultLabel"],
      manualDisabled: messages["admin.eventsEnrichment.manualDisabled"],
      configWindowLabel: messages["admin.eventsEnrichment.config.windowLabel"],
      configExpectationsLabel: messages["admin.eventsEnrichment.config.expectationsLabel"],
      configExpectationsEnabled: messages["admin.eventsEnrichment.config.expectationsEnabled"],
      configExpectationsDisabled: messages["admin.eventsEnrichment.config.expectationsDisabled"],
      aiPhilosophyTitle: messages["admin.eventsEnrichment.philosophy.title"],
      aiPhilosophyBody: messages["admin.eventsEnrichment.philosophy.body"],
    },
    eventsDedup: {
      title: messages["admin.eventsDedup.title"],
      description: messages["admin.eventsDedup.description"],
      daysBackLabel: messages["admin.eventsDedup.daysBackLabel"],
      daysAheadLabel: messages["admin.eventsDedup.daysAheadLabel"],
      dryRunLabel: messages["admin.eventsDedup.dryRunLabel"],
      advancedLabel: messages["admin.eventsDedup.advancedLabel"],
      buttonDryRun: messages["admin.eventsDedup.buttonDryRun"],
      buttonRealRun: messages["admin.eventsDedup.buttonRealRun"],
      realRunWarning: messages["admin.eventsDedup.realRunWarning"],
      lastRunLabel: messages["admin.eventsDedup.lastRun"],
      noRuns: messages["admin.eventsDedup.noRuns"],
      statusSuccess: messages["admin.eventsDedup.status.success"],
      statusFailed: messages["admin.eventsDedup.status.failed"],
      countsLabel: messages["admin.eventsDedup.counts"],
      windowLabel: messages["admin.eventsDedup.window"],
      duplicatesLabel: messages["admin.eventsDedup.duplicates"],
      deletesLabel: messages["admin.eventsDedup.deletes"],
      updatesLabel: messages["admin.eventsDedup.updates"],
      dryRunTag: messages["admin.eventsDedup.dryRunTag"],
      errorLabel: messages["admin.eventsDedup.error"],
      resultLabel: messages["admin.eventsDedup.result"],
    },
  };

  const lastEventsRun: EventsIngestionRunInfo | null = eventsAudit.runs[0]
    ? {
        id: eventsAudit.runs[0].id,
        ok: eventsAudit.runs[0].ok ?? false,
        createdAt: eventsAudit.runs[0].createdAt?.toISOString() ?? new Date().toISOString(),
        durationMs: eventsAudit.runs[0].durationMs ?? undefined,
        message: eventsAudit.runs[0].message ?? undefined,
        error: eventsAudit.runs[0].error ?? undefined,
        meta: (eventsAudit.runs[0].meta as EventsIngestionRunInfo["meta"]) ?? null,
      }
    : null;

  const lastEnrichmentRun: EventsEnrichmentRunInfo | null = enrichmentAudit.runs[0]
    ? {
        id: enrichmentAudit.runs[0].id,
        ok: enrichmentAudit.runs[0].ok ?? false,
        createdAt: enrichmentAudit.runs[0].createdAt?.toISOString() ?? new Date().toISOString(),
        durationMs: enrichmentAudit.runs[0].durationMs ?? undefined,
        message: enrichmentAudit.runs[0].message ?? undefined,
        error: enrichmentAudit.runs[0].error ?? undefined,
        meta: (enrichmentAudit.runs[0].meta as EventsEnrichmentRunInfo["meta"]) ?? null,
      }
    : null;

  const limitEnvRaw = Number(process.env.EVENTS_AI_ENRICH_LIMIT);
  const enrichmentEnvInfo = {
    enabled: process.env.EVENTS_AI_ENRICH_ENABLED === "1",
    limit: Number.isFinite(limitEnvRaw) ? limitEnvRaw : null,
    windowSummary: messages["admin.eventsEnrichment.config.windowValue"],
    expectationsEnabled: process.env.EVENTS_AI_ALLOW_EXPECTATION === "1",
  };

  const enrichmentStatsPayload: EventsEnrichmentStats = {
    total: enrichmentStats.total,
    enriched: enrichmentStats.enriched,
    fallbackOnly: enrichmentStats.fallbackOnly,
    candidates: enrichmentStats.candidates,
    lastEnrichedAt: enrichmentStats.lastEnrichedAt ? enrichmentStats.lastEnrichedAt.toISOString() : null,
  };

  const lastDedupRun: EventsDedupRunInfo | null = dedupAudit.runs[0]
    ? {
        id: dedupAudit.runs[0].id,
        ok: dedupAudit.runs[0].ok ?? false,
        createdAt: dedupAudit.runs[0].createdAt?.toISOString() ?? new Date().toISOString(),
        durationMs: dedupAudit.runs[0].durationMs ?? undefined,
        message: dedupAudit.runs[0].message ?? undefined,
        error: dedupAudit.runs[0].error ?? undefined,
        meta: (dedupAudit.runs[0].meta as EventsDedupRunInfo["meta"]) ?? null,
      }
    : null;
  const related = buildOpsGovernanceRelatedLinks(locale, {
    operations: messages["admin.nav.ops"],
    auditTrail: messages["admin.nav.audit"],
    systemHealth: messages["admin.nav.system"],
  });

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={opsMessages.title}
        description={opsMessages.description}
        relatedLabel={messages["admin.section.related"]}
        links={related}
        currentKey="operations"
        notice={messages["admin.ops.notice"]}
        variant="actions"
      />
      <OpsActionsPanel
        locale={locale}
        messages={opsMessages}
        latestSnapshot={latestSnapshotInfo}
        initialLockStatus={lockStatus}
      />
      <EventsIngestionPanel
        locale={locale}
        messages={opsMessages.eventsIngestion}
        lastRun={lastEventsRun}
      />
      <EventsEnrichmentPanel
        locale={locale}
        messages={opsMessages.eventsEnrichment}
        stats={enrichmentStatsPayload}
        lastRun={lastEnrichmentRun}
        envInfo={enrichmentEnvInfo}
      />
      <EventsDedupPanel locale={locale} messages={opsMessages.eventsDedup} lastRun={lastDedupRun} />
    </div>
  );
}
