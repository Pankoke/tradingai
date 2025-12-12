"use client";

import { AlertTriangle, Gauge, Info, Shield, TrendingUp } from "lucide-react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

export type TraderPlaybookProps = {
  setup: Pick<Setup, "rings" | "confidence"> &
    Partial<
      Pick<Setup, "riskReward" | "sentimentScore" | "eventScore" | "biasScore" | "ringAiSummary">
    > & { riskReward?: Setup["riskReward"] | null };
};

type Bucket = "low" | "medium" | "high";

function bucket(score: number): Bucket {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function riskBucket(risk?: number | null): "low" | "medium" | "high" | null {
  if (risk === undefined || risk === null || Number.isNaN(risk)) return null;
  if (risk <= 1.2) return "low";
  if (risk <= 2.5) return "medium";
  return "high";
}

function pickFactByLabel(
  keyFacts: Array<{ label: string; value: string }>,
  target: string,
): string | null {
  const found = keyFacts.find((f) => f.label.toLowerCase().includes(target.toLowerCase()));
  return found ? found.value : null;
}

type PlaybookItemType = "driver" | "risk" | "conflict" | "confidence" | "note";

const ITEM_ICONS: Record<PlaybookItemType, typeof TrendingUp> = {
  driver: TrendingUp,
  risk: Shield,
  conflict: AlertTriangle,
  confidence: Gauge,
  note: Info,
};

const ITEM_TONES: Record<PlaybookItemType, string> = {
  driver: "text-emerald-300",
  risk: "text-amber-300",
  conflict: "text-rose-300",
  confidence: "text-sky-300",
  note: "text-slate-300",
};

type PlaybookItem = {
  type: PlaybookItemType;
  text: string;
};

const ITEM_RENDER_ORDER: PlaybookItemType[] = ["driver", "risk", "conflict", "confidence", "note"];

export function TraderPlaybook({ setup }: TraderPlaybookProps): JSX.Element {
  const t = useT();
  const rings = setup.rings ?? {
    trendScore: 0,
    biasScore: setup.biasScore ?? 0,
    orderflowScore: 0,
    eventScore: setup.eventScore ?? 0,
    sentimentScore: setup.sentimentScore ?? 0,
  };

  const trend = rings.trendScore ?? 0;
  const bias = rings.biasScore ?? 0;
  const flow = rings.orderflowScore ?? 0;
  const event = rings.eventScore ?? setup.eventScore ?? 0;
  const rrr = setup.riskReward?.rrr ?? null;
  const confidence = rings.confidenceScore ?? setup.confidence ?? 0;
  const sentiment = rings.sentimentScore ?? 0;
  const riskPct = setup.riskReward?.riskPercent ?? null;
  const keyFacts = setup.ringAiSummary?.keyFacts ?? [];
  const eventBucket = event >= 75 ? "high" : event >= 40 ? "medium" : "low";
  const flowBucket = bucket(flow);
  const trendBucket = bucket(trend);
  const biasBucket = bucket(bias);
  const sentimentBucket = bucket(sentiment);
  const riskPctBucket = riskBucket(riskPct);

  const items: PlaybookItem[] = [];
  const push = (type: PlaybookItemType, text?: string | null) => {
    if (!text) return;
    items.push({ type, text });
  };

  if (keyFacts.length >= 1) {
    const driver = pickFactByLabel(keyFacts, "driver");
    const risk = pickFactByLabel(keyFacts, "risk");
    const conflict = pickFactByLabel(keyFacts, "conflict");
    const confidenceFact = pickFactByLabel(keyFacts, "confidence");
    const edge = pickFactByLabel(keyFacts, "edge");

    push("conflict", conflict);
    push("driver", driver ?? edge);
    push("risk", risk);
    push("confidence", confidenceFact);
  }

  if (items.length < 2) {
    if (eventBucket === "high") push("risk", t("perception.tradeDecision.playbook.highEvent"));
    else if (eventBucket === "medium") push("risk", t("perception.tradeDecision.playbook.mediumEvent"));
    else if (eventBucket === "low") push("driver", t("perception.tradeDecision.playbook.lowEvent"));
    if (rrr !== null && rrr < 2) push("risk", t("perception.tradeDecision.playbook.lowRRR"));
    if (confidence < 46) push("confidence", t("perception.tradeDecision.playbook.lowConfidence"));
    if (flowBucket === "low") push("risk", t("perception.tradeDecision.playbook.weakFlow"));
    if (trendBucket === "high" && biasBucket === "high") push("driver", t("perception.tradeDecision.playbook.trendBiasHigh"));
    else if (flowBucket === "high" || sentimentBucket === "high") push("driver", t("perception.tradeDecision.playbook.momentumPlay"));
    if (riskPctBucket === "high") {
      push(
        "risk",
        t("perception.tradeDecision.playbook.riskPctHigh")
          .replace("{risk}", (riskPct ?? 0).toFixed(2))
          .replace("{rrr}", rrr !== null ? rrr.toFixed(2) : "n/a"),
      );
    }
    if (items.length === 0) {
      push("note", t("perception.tradeDecision.playbook.default"));
    }
  }

  // If no edge (all buckets medium and weak RRR), keep it lean
  const allMedium =
    trendBucket === "medium" &&
    biasBucket === "medium" &&
    flowBucket === "medium" &&
    eventBucket === "medium" &&
    sentimentBucket === "medium";
  if (allMedium && (rrr === null || rrr < 2)) {
    items.splice(2);
  }

  const orderedItems = items
    .slice(0, 4)
    .sort(
      (a, b) =>
        ITEM_RENDER_ORDER.indexOf(a.type) - ITEM_RENDER_ORDER.indexOf(b.type) ||
        items.indexOf(a) - items.indexOf(b),
    );

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {t("perception.tradeDecision.playbook.title")}
      </p>
      <div className="mt-3 space-y-3">
        {orderedItems.map((item, idx) => {
          const Icon = ITEM_ICONS[item.type];
          return (
            <div
              key={`${item.type}-${idx}`}
              className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-2"
            >
              <Icon className={`mt-0.5 h-4 w-4 ${ITEM_TONES[item.type]}`} />
              <div className="flex-1">
                <p className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-400">
                  {t(`perception.tradeDecision.playbook.labels.${item.type}`)}
                </p>
                <p className="text-sm text-slate-100 line-clamp-2">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Bullet priority: Driver > Risk > Conflict > Confidence/Management; fallbacks use ring scores if keyFacts are missing.
