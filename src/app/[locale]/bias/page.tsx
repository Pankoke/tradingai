"use client";

import React, { useEffect, useState } from "react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { fetchTodayBiasSnapshot } from "@/src/lib/api/eventsBiasClient";
import type { BiasSnapshot, BiasEntry } from "@/src/lib/engine/eventsBiasTypes";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

type LoadState = "idle" | "loading" | "error";

export default function BiasPage(): JSX.Element {
  const t = useT();
  const [snapshot, setSnapshot] = useState<BiasSnapshot | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const data = await fetchTodayBiasSnapshot();
        setSnapshot(data);
        setState("idle");
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
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[var(--text-secondary)]">Lädt Bias ...</div>
      </div>
    );
  }

  if (state === "error" || !snapshot) {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[var(--text-secondary)]">
          {t("bias.empty")}
        </div>
      </div>
    );
  }

  const sortedEntries = [...snapshot.entries].sort((a, b) => {
    const sym = a.symbol.localeCompare(b.symbol);
    if (sym !== 0) return sym;
    return a.timeframe.localeCompare(b.timeframe);
  });

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("bias.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("bias.subtitle")}</p>
          <div className="grid gap-2 sm:grid-cols-3 text-sm text-[var(--text-secondary)]">
            <div>
              <div className="text-[0.7rem] uppercase tracking-wide">{t("bias.meta.lastUpdated")}</div>
              <div className="text-[var(--text-primary)] font-semibold">{formatDate(snapshot.generatedAt)}</div>
            </div>
            <div>
              <div className="text-[0.7rem] uppercase tracking-wide">{t("bias.meta.version")}</div>
              <div className="text-[var(--text-primary)] font-semibold">{snapshot.version}</div>
            </div>
            <div>
              <div className="text-[0.7rem] uppercase tracking-wide">{t("bias.meta.universe")}</div>
              <div className="text-[var(--text-primary)] font-semibold">{snapshot.universe.join(", ")}</div>
            </div>
          </div>
        </header>

        {sortedEntries.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
            {t("bias.empty")}
          </div>
       ) : (
         <div className="grid gap-3 sm:grid-cols-2">
           {sortedEntries.map((entry) => (
             <BiasCard key={`${entry.symbol}-${entry.timeframe}`} entry={entry} />
           ))}
         </div>
       )}
      </div>
    </div>
  );
}

function BiasCard({ entry }: { entry: BiasEntry }): JSX.Element {
  const tone =
    entry.direction === "Bullish"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
      : entry.direction === "Bearish"
        ? "bg-red-500/10 text-red-300 border-red-500/40"
        : "bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-subtle)]";

  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center justify-between text-sm">
        <div className="font-semibold text-[var(--text-primary)]">
          {entry.symbol} · {entry.timeframe}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{entry.direction}</span>
      </div>
      <div className="text-xs text-[var(--text-secondary)]">
        <div>
          Confidence: {entry.confidence}%
        </div>
      </div>
      <div className="text-xs text-[var(--text-secondary)]">{entry.comment}</div>
    </article>
  );
}
