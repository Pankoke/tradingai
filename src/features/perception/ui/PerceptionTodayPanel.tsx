"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, JSX, SVGProps } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { z } from "zod";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import { PerceptionCard } from "@/src/components/perception/PerceptionCard";
import { computeRingsForSnapshotItem } from "@/src/lib/engine/rings";

const TIMEOUT_MS = 10_000;

type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;

type Direction = "long" | "short" | "neutral";

const DIRECTION_META: Record<Direction, { Icon: LucideIcon; accent: string }> = {
  long: { Icon: ArrowUp, accent: "text-emerald-300 border-emerald-500/60 bg-emerald-500/10" },
  short: { Icon: ArrowDown, accent: "text-rose-300 border-rose-500/60 bg-rose-500/10" },
  neutral: { Icon: ArrowRight, accent: "text-slate-300 border-slate-500/40 bg-slate-500/10" },
};

const itemSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  assetId: z.string(),
  setupId: z.string(),
  direction: z.enum(["long", "short", "neutral"]),
  rankOverall: z.number(),
  rankWithinAsset: z.number(),
  scoreTotal: z.number(),
  scoreTrend: z.number().nullable(),
  scoreMomentum: z.number().nullable(),
  scoreVolatility: z.number().nullable(),
  scorePattern: z.number().nullable(),
  confidence: z.number(),
  biasScoreAtTime: z.number().nullable(),
  eventContext: z.unknown().nullable(),
  isSetupOfTheDay: z.boolean(),
  createdAt: z.string(),
});

const perceptionTodaySchema = z.object({
  snapshot: z.object({
    id: z.string(),
    snapshotTime: z.string(),
    label: z.string().nullable(),
    version: z.string(),
    dataMode: z.string(),
    generatedMs: z.number().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string(),
  }),
  items: itemSchema.array(),
});

type PerceptionTodayResponse = z.infer<typeof perceptionTodaySchema>;
type PerceptionTodayItem = PerceptionTodayResponse["items"][number];

function resolveApiUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return new URL(path, base).toString();
}

async function fetchPerceptionToday(): Promise<PerceptionTodayResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(resolveApiUrl("/api/perception/today"), {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const parsed = perceptionTodaySchema.safeParse(payload);
    if (!parsed.success) {
      const formatted = parsed.error.issues
        .map((issue) => {
          const path = issue.path.join(".") || "(root)";
          return `${path}: ${issue.message}`;
        })
        .join("; ");
      throw new Error(`Response validation failed: ${formatted}`);
    }

    return parsed.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatScore(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return `${Math.round(value)}`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

type StatusMessageProps = {
  message: string;
};

function StatusMessage({ message }: StatusMessageProps): JSX.Element {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
      {message}
    </div>
  );
}

type ScoreChipProps = {
  label: string;
  value: number | null;
};

function ScoreChip({ label, value }: ScoreChipProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-400">
      <span>{label}</span>
      <span className="text-base font-semibold text-white">{formatScore(value)}</span>
    </div>
  );
}

export function PerceptionTodayPanel(): JSX.Element {
  const t = useT();
  const [data, setData] = useState<PerceptionTodayResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async (): Promise<void> => {
      setStatus("loading");
      setErrorMessage(null);
      try {
        const payload = await fetchPerceptionToday();
        if (!isMounted) {
          return;
        }
        setData(payload);
        setStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("error");
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const heroItem = useMemo<PerceptionTodayItem | null>(() => {
    if (!data) {
      return null;
    }

    return data.items.find((item) => item.isSetupOfTheDay) ?? data.items[0] ?? null;
  }, [data]);
  const heroRings = useMemo(() => (heroItem ? computeRingsForSnapshotItem(heroItem) : undefined), [heroItem]);

  const additionalItems = useMemo(() => {
    if (!data) {
      return [];
    }
    if (!heroItem) {
      return data.items;
    }
    return data.items.filter((item) => item.id !== heroItem.id);
  }, [data, heroItem]);

  const heroDirectionMeta = heroItem ? DIRECTION_META[heroItem.direction] : DIRECTION_META.neutral;
  const HeroDirectionIcon = heroDirectionMeta.Icon;

  const modeKey = data?.snapshot.dataMode?.toLowerCase() === "live" ? "live" : "mock";
  const modeLabel = t(`perception.today.dataMode.${modeKey}`);
  const modeAccent =
    modeKey === "live"
      ? "text-emerald-300 border-emerald-500/60 bg-emerald-500/10"
      : "text-amber-300 border-amber-500/60 bg-amber-500/10";

  return (
    <section>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)]">
        <div className="rounded-3xl border border-slate-800 bg-[#0b1325] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {t("perception.today.title")}
              </p>
              <p className="text-sm text-white">
                {data?.snapshot.label ?? t("perception.today.metaLabel")}
              </p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${modeAccent}`}>
              {modeLabel}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {data
              ? `${t("perception.today.lastUpdated")}: ${formatTimestamp(data.snapshot.snapshotTime)}`
              : t("perception.today.loading")}
          </p>

          {status === "loading" && (
            <StatusMessage message={t("perception.today.loading")} />
          )}
          {status === "error" && (
            <StatusMessage
              message={
                errorMessage
                  ? `${t("perception.today.error")} (${errorMessage})`
                  : t("perception.today.error")
              }
            />
          )}
          {status === "ready" && (!data || data.items.length === 0) && (
            <StatusMessage message={t("perception.today.empty")} />
          )}

          {status === "ready" && heroItem && data && (
            <>
            <PerceptionCard className="mt-6" innerClassName="p-6">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        {t("perception.today.heroLabel")}
                      </p>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-semibold text-white">
                          {formatAssetLabel(heroItem.assetId)}
                        </h3>
                        <span className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                          {getAssetMeta(heroItem.assetId).assetClass}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {getAssetMeta(heroItem.assetId).name}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${heroDirectionMeta.accent}`}
                    >
                      <HeroDirectionIcon className="h-3.5 w-3.5" />
                      {t(`perception.today.direction.${heroItem.direction}`)}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {t("perception.today.scoreTotal")}
                    </p>
                    <p className="text-4xl font-bold text-white">{formatScore(heroItem.scoreTotal)}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span>
                        {t("perception.today.rankLabel")}: {heroItem.rankOverall}
                      </span>
                      <span className="text-slate-300">
                        {t("perception.today.confidenceLabel")}: {Math.round(heroItem.confidence)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <ScoreChip label={t("perception.today.scoreTrend")} value={heroItem.scoreTrend} />
                    <ScoreChip label={t("perception.today.scoreMomentum")} value={heroItem.scoreMomentum} />
                    <ScoreChip label={t("perception.today.scoreVolatility")} value={heroItem.scoreVolatility} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-5">
                    <ScoreChip label={t("perception.today.eventRing")} value={heroRings?.event ?? null} />
                    <ScoreChip label={t("perception.today.biasRing")} value={heroRings?.bias ?? null} />
                    <ScoreChip label={t("perception.today.sentimentRing")} value={heroRings?.sentiment ?? null} />
                    <ScoreChip label={t("perception.today.orderflowRing")} value={heroRings?.orderflow ?? null} />
                    <ScoreChip label={t("perception.today.confidenceRing")} value={heroRings?.confidence ?? null} />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    {t("perception.today.metaLabel")}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">{formatTimestamp(data.snapshot.snapshotTime)}</p>
                  <p className="text-xs text-slate-500">{`${t("perception.today.lastUpdated")}`}</p>
                  <div className="mt-4 grid gap-2 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>ID</span>
                      <span className="font-semibold text-white">{data.snapshot.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("perception.today.scoreTotal")}</span>
                      <span className="font-semibold text-white">{formatScore(heroItem.scoreTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("perception.today.scoreMomentum")}</span>
                      <span className="font-semibold text-white">{formatScore(heroItem.scoreMomentum)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </PerceptionCard>

              {additionalItems.length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>{t("perception.today.tableTitle")}</span>
                    <span className="text-[11px] text-slate-500">
                      {t("perception.today.lastUpdated")}: {formatTimestamp(data.snapshot.snapshotTime)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {additionalItems.map((item) => {
                      const asset = getAssetMeta(item.assetId);
                      const { Icon, accent } = DIRECTION_META[item.direction];
                      const itemRings = computeRingsForSnapshotItem(item);
                      return (
                        <PerceptionCard key={item.id} innerClassName="p-4" className="">
                          <div>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">{asset.displaySymbol}</p>
                                <p className="text-xs text-slate-400">{asset.name}</p>
                              </div>
                              <div
                                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${accent}`}
                              >
                                <Icon className="h-3 w-3" />
                                {t(`perception.today.direction.${item.direction}`)}
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-3">
                              <ScoreChip label={t("perception.today.scoreTrend")} value={item.scoreTrend} />
                              <ScoreChip label={t("perception.today.scoreMomentum")} value={item.scoreMomentum} />
                              <ScoreChip label={t("perception.today.scoreVolatility")} value={item.scoreVolatility} />
                            </div>
                            <div className="mt-2 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-5">
                              <ScoreChip label={t("perception.today.eventRing")} value={itemRings.event} />
                              <ScoreChip label={t("perception.today.biasRing")} value={itemRings.bias} />
                              <ScoreChip label={t("perception.today.sentimentRing")} value={itemRings.sentiment} />
                              <ScoreChip label={t("perception.today.orderflowRing")} value={itemRings.orderflow} />
                              <ScoreChip label={t("perception.today.confidenceRing")} value={itemRings.confidence} />
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span>
                                {t("perception.today.rankLabel")}: {item.rankOverall}
                              </span>
                              <span>
                                {t("perception.today.confidenceLabel")}: {Math.round(item.confidence)}%
                              </span>
                            </div>
                          </div>
                        </PerceptionCard>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
