import type { RingAiSummary, Setup } from "@/src/lib/engine/types";

type EnhanceParams = {
  setup: Pick<
    Setup,
    | "assetId"
    | "symbol"
    | "timeframe"
    | "direction"
    | "rings"
    | "riskReward"
  >;
  heuristic: RingAiSummary;
};

const DEFAULT_MODEL = process.env.RING_AI_SUMMARY_MODEL ?? "gpt-4o-mini";

function isLlmEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.RING_AI_SUMMARY_LLM_ENABLED === "1";
}

/**
 * Calls OpenAI to refine the ring AI summary. If anything fails or the feature is disabled,
 * returns the heuristic summary unchanged.
 */
export async function maybeEnhanceRingAiSummaryWithLLM(params: EnhanceParams): Promise<RingAiSummary> {
  if (!isLlmEnabled()) {
    return params.heuristic;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return params.heuristic;
  }

  try {
    const { setup, heuristic } = params;
    const payload = {
      model: DEFAULT_MODEL,
      temperature: 0.6,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content:
            "You are a trading desk analyst. Write concise, trader-focused summaries in 2-4 sentences. " +
            "Highlight drivers, risks, conflicts. Mention key numbers (trend/bias/event/orderflow/confidence/RRR/risk%).",
        },
        {
          role: "user",
          content: `
Asset: ${setup.symbol ?? setup.assetId ?? "n/a"}
Timeframe: ${setup.timeframe ?? "n/a"}
Direction: ${setup.direction ?? "n/a"}

Rings:
- Trend: ${Math.round(setup.rings.trendScore)}
- Bias: ${Math.round(setup.rings.biasScore)}
- Orderflow: ${Math.round(setup.rings.orderflowScore)}
- Sentiment: ${Math.round(setup.rings.sentimentScore)}
- Event: ${Math.round(setup.rings.eventScore)}
- Confidence: ${Math.round(setup.rings.confidenceScore ?? 0)}

Risk/Reward:
- RRR: ${setup.riskReward?.rrr ?? "n/a"}
- Risk%: ${setup.riskReward?.riskPercent ?? "n/a"}
- Reward%: ${setup.riskReward?.rewardPercent ?? "n/a"}
- Volatility: ${setup.riskReward?.volatilityLabel ?? "n/a"}

Heuristic shortSummary: ${heuristic.shortSummary}
Heuristic longSummary: ${heuristic.longSummary}
Heuristic keyFacts: ${heuristic.keyFacts.map((k) => `${k.label}: ${k.value}`).join("; ")}

Task: Provide a refined short headline (1 sentence) and an enriched long summary (2-3 sentences) for traders. Use heuristic signals; do not contradict buckets. Headline + long summary must mention: drivers, risks, conflicts with numbers. If trend>=70 and bias>=65, explicitly state Drivers: high trend + high bias. If event is medium/high, call out event risk. If orderflow<=40, call it weak flow/positioning. If high trend/bias but weak flow, add a Conflict sentence. If RRR>=2 or Risk%>2, note that as positive (RRR) or risk (risk%). Output only plain text (no JSON).
          `,
        },
      ],
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn("[RingAiSummary:llm] OpenAI call failed", await response.text());
      return heuristic;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return heuristic;
    }

    // Heuristic: split first sentence as short headline, rest as long
    const sentences = content.split(/(?<=[.!?])\s+/);
    const newShort = sentences.shift() ?? heuristic.shortSummary;
    const newLong = [sentences.join(" ") || heuristic.longSummary].join(" ").trim();

    return {
      shortSummary: newShort,
      longSummary: newLong.length ? newLong : heuristic.longSummary,
      keyFacts: heuristic.keyFacts,
      source: "llm",
    };
  } catch (error) {
    console.warn("[RingAiSummary:llm] Falling back to heuristic", error);
    return params.heuristic;
  }
}
