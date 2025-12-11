"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { RingInspectorLayout } from "@/src/components/perception/RingInspectorLayout";
import type { RingInspectorBaseProps } from "@/src/components/perception/RingInspectorTypes";

const bucketFromScore = (score: number): "low" | "medium" | "high" => {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

export type TrendInspectorProps = RingInspectorBaseProps;

export function TrendInspector({
  setup,
  variant = "full",
  className,
}: TrendInspectorProps): JSX.Element {
  const t = useT();
  const score = setup.rings?.trendScore;

  if (score === undefined) {
    return (
      <RingInspectorLayout
        title={t("perception.trend.heading")}
        variant={variant}
        className={className}
        emptyState={t("perception.trend.empty")}
      />
    );
  }

  const bucket = bucketFromScore(score);
  const bucketLabel = t(`perception.rings.bucket.${bucket}`);
  const directionKey = setup.direction
    ? `perception.today.direction.${setup.direction.toLowerCase()}`
    : "perception.today.direction.neutral";
  const directionValue = t(directionKey);
  const directionText = t("perception.trend.directionLabel").replace(
    "{direction}",
    directionValue,
  );
  const bucketSummary = t(`perception.trend.summary.${bucket}`);
  const summary =
    variant === "compact"
      ? bucketSummary
      : `${directionText} - ${bucketSummary}`;

  const bulletBase: string[] = [
    t("perception.trend.detail.score")
      .replace("{score}", String(Math.round(score)))
      .replace("{bucket}", bucketLabel),
    t("perception.trend.detail.directionHint").replace(
      "{direction}",
      directionValue,
    ),
  ];
  if (setup.timeframe) {
    bulletBase.push(
      t("perception.trend.detail.timeframe").replace(
        "{timeframe}",
        setup.timeframe,
      ),
    );
  }
  const detailItems =
    variant === "compact" ? bulletBase.slice(0, 1) : bulletBase;

  const details =
    detailItems.length > 0 ? (
      <ul className="space-y-1">
        {detailItems.map((item, index) => (
          <li key={index} className="text-sm text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <RingInspectorLayout
      title={t("perception.trend.heading")}
      scoreLabel={`${Math.round(score)} / 100`}
      scoreTone={bucket}
      summary={summary}
      variant={variant}
      className={className}
      emptyState={t("perception.trend.empty")}
    >
      {details}
    </RingInspectorLayout>
  );
}
