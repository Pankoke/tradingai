import { OpsActionsPanel } from "@/src/components/admin/OpsActionsPanel";
import type { LockStatusState } from "@/src/components/admin/OpsActionsPanel";
import { EventsIngestionPanel } from "@/src/components/admin/EventsIngestionPanel";
import type { EventsIngestionRunInfo } from "@/src/components/admin/EventsIngestionPanel";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";
import { listAuditRuns } from "@/src/server/repositories/auditRunRepository";
import {
  getSnapshotSourceFromNotes,
  getSnapshotBuildStatus,
} from "@/src/server/perception/snapshotBuildService";
import type { SnapshotBuildSource } from "@/src/features/perception/build/buildSetups";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOpsPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const [latestSnapshot, rawLockStatus, eventsAudit] = await Promise.all([
    getLatestSnapshot(),
    getSnapshotBuildStatus(),
    listAuditRuns({ filters: { action: "events.ingest" }, limit: 1 }),
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
      selectLabel: messages["admin.eventsIngestion.selectLabel"],
      selectOptions: {
        "30": messages["admin.eventsIngestion.option30"],
        "45": messages["admin.eventsIngestion.option45"],
        "60": messages["admin.eventsIngestion.option60"],
      },
      lastRunLabel: messages["admin.eventsIngestion.lastRun"],
      noRuns: messages["admin.eventsIngestion.noRuns"],
      statusSuccess: messages["admin.eventsIngestion.status.success"],
      statusFailed: messages["admin.eventsIngestion.status.failed"],
      countsLabel: messages["admin.eventsIngestion.counts"],
      windowLabel: messages["admin.eventsIngestion.window"],
      runAtLabel: messages["admin.eventsIngestion.runAt"],
      errorLabel: messages["admin.eventsIngestion.error"],
      resultLabel: messages["admin.eventsIngestion.result"],
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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
        <h1 className="text-3xl font-semibold text-white">{opsMessages.title}</h1>
        <p className="text-sm text-slate-400">{opsMessages.description}</p>
      </header>
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
    </div>
  );
}
