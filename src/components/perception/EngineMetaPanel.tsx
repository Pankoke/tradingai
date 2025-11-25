"use client";

import React from "react";
import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/src/lib/i18n/ClientProvider";

type EngineMetaPanelProps = {
  generatedAt: string;
  version: string;
  universe: string[];
};

export function EngineMetaPanel({ generatedAt, version, universe }: EngineMetaPanelProps): JSX.Element {
  const t = useT();
  const router = useRouter();

  const formattedDate = new Date(generatedAt).toLocaleString();

  const handleRefresh = (): void => {
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{t("perception.engineMeta.title")}</div>
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)]/70"
        >
          {t("perception.refresh")}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 sm:items-center">
        <MetaItem label={t("perception.engineMeta.lastUpdated")} value={formattedDate} />
        <MetaItem label={t("perception.engineMeta.version")} value={version} />
        <div className="flex flex-wrap gap-2">
          <span className="text-[0.7rem] uppercase tracking-wide text-[var(--text-secondary)]">
            {t("perception.engineMeta.universe")}
          </span>
          {universe.map((u) => (
            <span
              key={u}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2 py-0.5 text-[0.75rem] text-[var(--text-primary)]"
            >
              {u}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type MetaItemProps = {
  label: string;
  value: string;
};

function MetaItem({ label, value }: MetaItemProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.7rem] uppercase tracking-wide text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
