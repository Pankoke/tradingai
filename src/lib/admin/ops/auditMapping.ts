import type { AuditRowViewModel } from "@/src/lib/admin/audit/viewModel";

export type OpsActionKey =
  | "perceptionSnapshot"
  | "marketdataSync"
  | "biasSync"
  | "eventsIngest"
  | "eventsEnrich"
  | "eventsDedup";

export type OpsActionDefinition = {
  key: OpsActionKey;
  labelKey: string;
  query: string;
  matches: (row: AuditRowViewModel) => boolean;
};

export const OPS_ACTION_DEFINITIONS: readonly OpsActionDefinition[] = [
  {
    key: "perceptionSnapshot",
    labelKey: "admin.ops.perception.title",
    query: "snapshot_build",
    matches: (row) => row.action === "snapshot_build",
  },
  {
    key: "marketdataSync",
    labelKey: "admin.ops.marketdata.title",
    query: "marketdata_sync",
    matches: (row) => row.action === "marketdata_sync",
  },
  {
    key: "biasSync",
    labelKey: "admin.ops.bias.title",
    query: "bias_sync",
    matches: (row) => row.action === "bias_sync",
  },
  {
    key: "eventsIngest",
    labelKey: "admin.eventsIngestion.title",
    query: "events.ingest",
    matches: (row) => row.action === "events.ingest",
  },
  {
    key: "eventsEnrich",
    labelKey: "admin.eventsEnrichment.title",
    query: "events.enrich",
    matches: (row) => row.action === "events.enrich",
  },
  {
    key: "eventsDedup",
    labelKey: "admin.eventsDedup.title",
    query: "events.dedup_sweep",
    matches: (row) => row.action === "events.dedup_sweep",
  },
] as const;

function timestamp(value: Date | string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getLastRunByAction(rows: AuditRowViewModel[]): Partial<Record<OpsActionKey, AuditRowViewModel>> {
  const sorted = [...rows].sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt));
  const out: Partial<Record<OpsActionKey, AuditRowViewModel>> = {};

  for (const definition of OPS_ACTION_DEFINITIONS) {
    out[definition.key] = sorted.find((row) => definition.matches(row));
  }

  return out;
}
