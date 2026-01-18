import type { Setup } from "@/src/lib/engine/types";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";
import type { DecisionResult } from "@/src/lib/decision/setupDecision";

type WatchPlusResult = { isWatchPlus: boolean; label?: string };

const GOLD_PLAYBOOK_ID = "gold-swing-v0.2";
const BIAS_MIN = 65;
const SIGNAL_QUALITY_MIN = 55;
const CONFIDENCE_MIN = 55;
const TREND_MAX_FOR_WATCH = 50; // WATCH+ falls nur Trend-Gate fehlt

export function isWatchPlusGold(params: {
  setup: Setup;
  decision: DecisionResult;
  signalQuality?: SignalQuality | null;
}): WatchPlusResult {
  const { setup, decision, signalQuality } = params;
  const decisionLower = decision.decision?.toLowerCase() ?? "";
  if (decisionLower !== "watch") return { isWatchPlus: false };
  const playbookId = ((setup as { setupPlaybookId?: string | null }).setupPlaybookId ?? "").toLowerCase();
  if (playbookId !== GOLD_PLAYBOOK_ID) return { isWatchPlus: false };

  const bias = typeof setup.biasScore === "number" ? setup.biasScore : null;
  const trend = typeof setup.rings?.trendScore === "number" ? setup.rings.trendScore : null;
  const conf = typeof setup.rings?.confidenceScore === "number" ? setup.rings.confidenceScore : null;
  const sq = typeof signalQuality?.score === "number" ? signalQuality.score : null;
  const validity = (setup as { validity?: { isStale?: boolean } | null }).validity;
  const hard = decision.category === "hard";

  if (validity?.isStale) return { isWatchPlus: false };
  if (hard) return { isWatchPlus: false };

  const biasOk = (bias ?? -Infinity) >= BIAS_MIN;
  const sqOk = (sq ?? -Infinity) >= SIGNAL_QUALITY_MIN;
  const confOk = (conf ?? -Infinity) >= CONFIDENCE_MIN;
  const trendFail = trend !== null && trend < TREND_MAX_FOR_WATCH;

  if (biasOk && sqOk && confOk && trendFail) {
    return { isWatchPlus: true, label: "Upgrade-Kandidat" };
  }

  return { isWatchPlus: false };
}
