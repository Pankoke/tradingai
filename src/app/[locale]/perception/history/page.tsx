"use client";

import React, { useEffect, useState } from "react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { fetchPerceptionHistory } from "@/src/lib/api/perceptionHistoryClient";
import type { PerceptionHistoryEntry } from "@/src/lib/cache/perceptionHistory";

type LoadState = "loading" | "error" | "ready";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function PerceptionHistoryPage(): JSX.Element {
  const t = useT();
  const [entries, setEntries] = useState<PerceptionHistoryEntry[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const data = await fetchPerceptionHistory(10);
        setEntries(data);
        setState("ready");
      } catch (error) {
        console.error(error);
        setState("error");
      }
    };
    void load();
  }, []);

  if (state === "loading") {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[var(--text-secondary)]">Lädt History ...</div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[var(--text-secondary)]">
          {t("perceptionHistory.empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("perceptionHistory.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("perceptionHistory.subtitle")}</p>
        </header>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
            {t("perceptionHistory.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-subtle)] text-sm">
              <thead className="bg-[var(--bg-surface)] text-[0.75rem] uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>
                  <th className="px-3 py-2 text-left">{t("perceptionHistory.table.date")}</th>
                  <th className="px-3 py-2 text-left">{t("perceptionHistory.table.symbol")}</th>
                  <th className="px-3 py-2 text-left">{t("perceptionHistory.table.timeframe")}</th>
                  <th className="px-3 py-2 text-left">{t("perceptionHistory.table.direction")}</th>
                  <th className="px-3 py-2 text-left">{t("perceptionHistory.table.confidence")}</th>
                  <th className="px-3 py-2 text-left">{t("perceptionHistory.table.totalSetups")}</th>
                  <th className="px-3 py-2 text-left">{t("perceptionHistory.table.events")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {entries.map((entry) => {
                  const setupOfTheDay = entry.snapshot.setups.find(
                    (s) => s.id === entry.snapshot.setupOfTheDayId,
                  );
                  return (
                    <tr key={entry.id} className="bg-[var(--bg-main)] text-[var(--text-primary)]">
                      <td className="px-3 py-2">{formatDate(entry.createdAt)}</td>
                      <td className="px-3 py-2">{setupOfTheDay ? setupOfTheDay.symbol : "—"}</td>
                      <td className="px-3 py-2">{setupOfTheDay ? setupOfTheDay.timeframe : "—"}</td>
                      <td className="px-3 py-2">{setupOfTheDay ? setupOfTheDay.direction : "—"}</td>
                      <td className="px-3 py-2">
                        {setupOfTheDay ? `${setupOfTheDay.confidence}%` : "—"}
                      </td>
                      <td className="px-3 py-2">{entry.snapshot.setups.length}</td>
                      <td className="px-3 py-2">{entry.events.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
