"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, JSX, SVGProps } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import { LevelDebugBlock } from "@/src/components/perception/LevelDebugBlock";
import { RiskRewardBlock } from "@/src/components/perception/RiskRewardBlock";
import { PerceptionCard } from "@/src/components/perception/PerceptionCard";
import type { Setup } from "@/src/lib/engine/types";
import type { SetupRingScores, SetupRings } from "@/src/lib/engine/rings";
import { computeRingsForSnapshotItem, createDefaultRings } from "@/src/lib/engine/rings";
import { fetchPerceptionToday, type PerceptionTodayResponse } from "@/src/lib/api/perceptionClient";
import { BigGauge, SmallGauge } from "@/src/components/perception/RingGauges";
import { formatRelativeTime } from "@/src/lib/formatters/datetime";
import { isPerceptionMockMode } from "@/src/lib/config/perceptionDataMode";
import { mockSetups } from "@/src/lib/mockSetups";

type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;

type Direction = "long" | "short" | "neutral";

const DIRECTION_META: Record<Direction, { Icon: LucideIcon; accent: string }> = {
  long: { Icon: ArrowUp, accent: "text-emerald-300 border-emerald-500/60 bg-emerald-500/10" },
  short: { Icon: ArrowDown, accent: "text-rose-300 border-rose-500/60 bg-rose-500/10" },
  neutral: { Icon: ArrowRight, accent: "text-slate-300 border-slate-500/40 bg-slate-500/10" },
};

const DEFAULT_RING_VALUES: SetupRings = createDefaultRings();

type RingDefinition = {
  key: keyof SetupRingScores;
  label: string;
  tone: "accent" | "green" | "teal" | "neutral";
  tooltip: string;
  metaKey?: keyof Setup["rings"]["meta"];
};

type PerceptionTodayItem = PerceptionTodayResponse["items"][number];
type EventContextLite = PerceptionTodayItem["eventContext"] | Setup["eventContext"];

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

function formatEventTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function buildEventTooltip(
  baseTooltip: string,
  eventContext?: { topEvents?: Array<{ title?: string; scheduledAt?: string }> | null } | null,
  translate?: (key: string) => string,
): JSX.Element {
  const top = eventContext?.topEvents?.[0];
  const contextLine =
    top && translate
      ? translate("perception.rings.tooltip.eventContext")
          .replace("{title}", top.title ?? "")
          .replace("{time}", formatEventTime(top.scheduledAt))
      : null;

  return (
    <div className="flex flex-col gap-1 text-left">
      <p>{baseTooltip}</p>
      {contextLine ? <p className="text-xs text-slate-300">{contextLine}</p> : null}
    </div>
  );
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

function createMockPerceptionTodayResponse(): PerceptionTodayResponse {
  const snapshotTime = new Date();
  const snapshotId = "mock-snapshot";
  const createdAt = snapshotTime.toISOString();
  const rankWithinAsset = new Map<string, number>();

  const items = mockSetups.map((setup, index) => {
    const assetRank = (rankWithinAsset.get(setup.assetId) ?? 0) + 1;
    rankWithinAsset.set(setup.assetId, assetRank);
    const direction = setup.direction.toLowerCase() as Direction;
    const scoreTrend = setup.eventScore;
    const scoreMomentum = setup.sentimentScore;
    const scoreVolatility = Math.max(0, Math.round(Math.abs(setup.biasScore - setup.eventScore)));
    const scorePattern = setup.balanceScore;
    const scoreTotal = Math.round(
      (scoreTrend + scoreMomentum + scoreVolatility + scorePattern + setup.biasScore) / 5,
    );

    return {
      id: `mock-item-${index + 1}`,
      snapshotId,
      assetId: setup.assetId,
      setupId: setup.id,
      direction,
      rankOverall: index + 1,
      rankWithinAsset: assetRank,
      scoreTotal,
      scoreTrend,
      scoreMomentum,
      scoreVolatility,
      scorePattern,
      confidence: setup.confidence,
      biasScoreAtTime: setup.biasScore,
      eventContext: null,
      isSetupOfTheDay: index === 0,
      createdAt,
      riskReward: setup.riskReward,
    };
  });

  const setups: Setup[] = mockSetups.map((setup) => ({
    ...setup,
    snapshotId,
    snapshotCreatedAt: createdAt,
  }));

  return {
    snapshot: {
      id: snapshotId,
      snapshotTime: snapshotTime.toISOString(),
      label: "mock",
      version: "mock",
      dataMode: "mock",
      generatedMs: null,
      notes: null,
      createdAt,
    },
    items,
    setups,
  };
}

export function PerceptionTodayPanel(): JSX.Element {
  const t = useT();
  const isMockMode = isPerceptionMockMode();
  const [data, setData] = useState<PerceptionTodayResponse | null>(null);
  const [setups, setSetups] = useState<Setup[] | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "empty" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async (): Promise<void> => {
      if (isMockMode) {
        const mockPayload = createMockPerceptionTodayResponse();
        if (!isMounted) {
          return;
        }
        setData(mockPayload);
        setSetups(mockPayload.setups);
        setStatus(mockPayload.items.length > 0 ? "ready" : "empty");
        return;
      }
      setStatus("loading");
      setErrorMessage(null);
      try {
        const perceptionPayload = await fetchPerceptionToday();
        if (!isMounted) {
          return;
        }
        const hasItems = perceptionPayload.items && perceptionPayload.items.length > 0;
        setData(perceptionPayload);
        setSetups(perceptionPayload.setups);
        setStatus(hasItems ? "ready" : "empty");
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
  }, [isMockMode]);

  const heroItem = useMemo<PerceptionTodayItem | null>(() => {
    if (!data) {
      return null;
    }
    return data.items.find((item) => item.isSetupOfTheDay) ?? data.items[0] ?? null;
  }, [data]);

  const setupLookup = useMemo(
    () => new Map((setups ?? []).map((setup) => [setup.id, setup])),
    [setups],
  );

  const heroSetup = useMemo(
    () => (heroItem ? setupLookup.get(heroItem.setupId) : undefined),
    [heroItem, setupLookup],
  );

  const heroBaseRings = useMemo(() => {
    const rings = heroSetup?.rings ?? (heroItem ? computeRingsForSnapshotItem(heroItem) : undefined);
    return rings ?? DEFAULT_RING_VALUES;
  }, [heroSetup, heroItem]);

  const heroRingDefinitions = useMemo<RingDefinition[]>(() => [
    { key: "trendScore", label: t("perception.today.scoreTrend"), tone: "teal", tooltip: t("perception.rings.tooltip.trend"), metaKey: "trend" },
    { key: "eventScore", label: t("perception.today.eventRing"), tone: "accent", tooltip: t("perception.rings.tooltip.event"), metaKey: "event" },
    { key: "biasScore", label: t("perception.today.biasRing"), tone: "green", tooltip: t("perception.rings.tooltip.bias"), metaKey: "bias" },
    { key: "sentimentScore", label: t("perception.today.sentimentRing"), tone: "teal", tooltip: t("perception.rings.tooltip.sentiment"), metaKey: "sentiment" },
    { key: "orderflowScore", label: t("perception.today.orderflowRing"), tone: "accent", tooltip: t("perception.rings.tooltip.orderflow"), metaKey: "orderflow" },
  ], [t]);

  const itemRingDefinitions = useMemo<RingDefinition[]>(
    () => [
      ...heroRingDefinitions,
      {
        key: "confidenceScore",
        label: t("perception.today.confidenceRing"),
        tone: "green",
        tooltip: t("perception.rings.tooltip.confidence"),
        metaKey: "confidence",
      },
    ],
    [heroRingDefinitions, t],
  );

  const additionalItems = useMemo(() => {
    if (!data) {
      return [];
    }
    if (!heroItem) {
      return data.items;
    }
    return data.items.filter((item) => item.id !== heroItem.id);
  }, [data, heroItem]);

  const additionalEntries = useMemo(
    () =>
      additionalItems.map((item) => {
        const setup = setupLookup.get(item.setupId);
        const rings = setup?.rings ?? computeRingsForSnapshotItem(item);
        return { item, setup, rings };
      }),
    [additionalItems, setupLookup],
  );

  const heroDirectionMeta = heroItem ? DIRECTION_META[heroItem.direction] : DIRECTION_META.neutral;
  const HeroDirectionIcon = heroDirectionMeta.Icon;

  const modeKey =
    isMockMode || data?.snapshot.dataMode?.toLowerCase() === "mock" ? "mock" : "live";
  const modeLabel = t(`perception.today.mode.${modeKey}`);
  const modeAccent =
    modeKey === "live"
      ? "text-emerald-300 border-emerald-500/60 bg-emerald-500/10"
      : "text-amber-300 border-amber-500/60 bg-amber-500/10";

  const snapshotRelative =
    data?.snapshot.snapshotTime ? formatRelativeTime(data.snapshot.snapshotTime) : null;
  const snapshotAgeLabel = snapshotRelative
    ? t("perception.today.snapshotAge").replace("{relative}", snapshotRelative)
    : null;
  const heroEventContext = heroItem?.eventContext ?? heroSetup?.eventContext ?? null;

  useEffect(() => {
    // Nur im Browser & nur in DEV loggen
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production") return;
    if (!data || status !== "ready") return;

    data.setups.forEach((setup) => {
      const ctx = setup.eventContext;
      if (!ctx?.topEvents?.length) return;

      const top = ctx.topEvents[0];

      console.debug("[EventRing]", {
        assetId: setup.assetId,
        setupId: setup.id,
        eventScore: setup.eventScore,
        event: {
          id: top.id,
          title: top.title,
          severity: top.severity,
          scheduledAt: top.scheduledAt,
          source: top.source,
        },
      });
    });
  }, [data, status]);

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
          <div className="text-xs text-slate-500 space-y-1">
            <p>
              {data
                ? `${t("perception.today.lastUpdated")}: ${formatTimestamp(data.snapshot.snapshotTime)}`
                : t("perception.today.loading")}
            </p>
            {snapshotAgeLabel ? <p className="text-slate-400">{snapshotAgeLabel}</p> : null}
          </div>

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
          {status === "empty" && (
            <StatusMessage message={t("perception.today.empty")} />
          )}

          {status === "ready" && heroItem && data && (
            <>
            <PerceptionCard className="mt-6" innerClassName="p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
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
                  <p className="text-sm text-slate-400">{getAssetMeta(heroItem.assetId).name}</p>
                  <div
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${heroDirectionMeta.accent}`}
                  >
                    <HeroDirectionIcon className="h-3.5 w-3.5" />
                    {t(`perception.today.direction.${heroItem.direction}`)}
                  </div>
                </div>
                  <BigGauge
                    value={heroBaseRings.confidenceScore}
                    label={t("perception.today.confidenceRing")}
                    tooltip={t("perception.rings.tooltip.confidence")}
                    meta={heroBaseRings.meta.confidence}
                  />
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

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {heroRingDefinitions.map((ring) => (
                  <SmallGauge
                    key={ring.label}
                    label={ring.label}
                    value={heroBaseRings[ring.key]}
                    tone={ring.tone}
                    tooltip={
                      ring.key === "eventScore"
                        ? buildEventTooltip(ring.tooltip, heroEventContext, t)
                        : ring.tooltip
                    }
                    meta={ring.metaKey ? heroBaseRings.meta[ring.metaKey] : undefined}
                  />
                ))}
              </div>

              {heroSetup ? (
                <>
                  <LevelDebugBlock
                    category={heroSetup.category ?? heroSetup.levelDebug?.category}
                    referencePrice={heroSetup.levelDebug?.referencePrice ?? null}
                    bandPct={heroSetup.levelDebug?.bandPct ?? null}
                    volatilityScore={heroSetup.levelDebug?.volatilityScore ?? null}
                    scoreVolatility={heroItem.scoreVolatility ?? heroSetup.levelDebug?.scoreVolatility ?? null}
                    entryZone={heroSetup.entryZone}
                    stopLoss={heroSetup.stopLoss}
                    takeProfit={heroSetup.takeProfit}
                    rings={heroBaseRings}
                    snapshotId={heroSetup.snapshotId ?? null}
                    snapshotCreatedAt={heroSetup.snapshotCreatedAt ?? null}
                    eventContext={heroEventContext ?? undefined}
                  />
                  <div className="mt-4">
                    <RiskRewardBlock riskReward={heroSetup?.riskReward ?? heroItem?.riskReward ?? null} />
                  </div>
                </>
              ) : null}

              <div className="mt-6 grid gap-2 text-xs text-slate-400">
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
            </PerceptionCard>

              {additionalEntries.length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>{t("perception.today.tableTitle")}</span>
                    <span className="text-[11px] text-slate-500">
                      {t("perception.today.lastUpdated")}: {formatTimestamp(data.snapshot.snapshotTime)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {additionalEntries.map(({ item, setup, rings }) => {
                      const asset = getAssetMeta(item.assetId);
                      const { Icon, accent } = DIRECTION_META[item.direction];
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
                            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] sm:grid-cols-4 md:grid-cols-6">
                              {itemRingDefinitions.map((ring) => (
                                <SmallGauge
                                  key={ring.label}
                                  label={ring.label}
                                  value={rings[ring.key]}
                                  tone={ring.tone}
                                  tooltip={
                                    ring.key === "eventScore"
                                      ? buildEventTooltip(
                                          ring.tooltip,
                                          item.eventContext ?? setup?.eventContext ?? null,
                                          t,
                                        )
                                      : ring.tooltip
                                  }
                                  meta={ring.metaKey ? rings.meta[ring.metaKey] : undefined}
                                />
                              ))}
                            </div>
                            {setup ? (
                              <>
                              <LevelDebugBlock
                                category={setup.category ?? setup.levelDebug?.category}
                                referencePrice={setup.levelDebug?.referencePrice ?? null}
                                bandPct={setup.levelDebug?.bandPct ?? null}
                                volatilityScore={setup.levelDebug?.volatilityScore ?? null}
                                scoreVolatility={item.scoreVolatility ?? setup.levelDebug?.scoreVolatility ?? null}
                                entryZone={setup.entryZone}
                                stopLoss={setup.stopLoss}
                                takeProfit={setup.takeProfit}
                                rings={rings}
                                snapshotId={setup.snapshotId ?? null}
                                snapshotCreatedAt={setup.snapshotCreatedAt ?? null}
                                eventContext={
                                  (item.eventContext as EventContextLite) ??
                                  (setup as { eventContext?: EventContextLite })?.eventContext ??
                                  undefined
                                }
                              />
                                <div className="mt-3">
                                  <RiskRewardBlock riskReward={setup?.riskReward ?? item.riskReward ?? null} />
                                </div>
                              </>
                            ) : null}
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span>
                                {t("perception.today.rankLabel")}: {item.rankOverall}
                              </span>
                              <span>
                                {t("perception.today.confidenceLabel")}: {Math.round(rings.confidenceScore)}%
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
