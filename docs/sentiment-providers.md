## Sentiment Providers

The perception engine currently uses a single internal heuristic provider. External feeds (Coinglass/Binance) were removed, but the abstraction remains so that new sources can be plugged in later without touching the engine.

### Internal Heuristic Provider

- **Source**: `src/server/sentiment/internalSentimentProvider.ts`
- **Inputs** (all optional, depending on the available context):
  - Normalised bias score (derived from bias snapshots)
  - Trend & momentum scores from `marketMetrics`
  - Orderflow proxy (currently momentum score)
  - Event risk placeholder (kept at neutral until dedicated data feed exists)
  - Risk/Reward summary (RRR, risk%, volatility label)
  - Price drift information
- **Output**: `SentimentRawSnapshot` with the above fields plus debug metadata (`source="internal_heuristic"`).

### Sentiment Metrics Heuristics

`buildSentimentMetrics` ( `src/lib/engine/sentimentMetrics.ts`) consumes the snapshot and produces a score in the **0–100** range as well as the label bucket:

| Score        | Label             |
|--------------|-------------------|
| 0–20         | `extreme_bearish` |
| 21–35        | `bearish`         |
| 36–65        | `neutral`         |
| 66–84        | `bullish`         |
| 85–100       | `extreme_bullish` |

Adjustments are additive around a neutral base of 50:
- Strong bias/trend/momentum/orderflow push the score up; weak readings subtract.
- Elevated event risk or high volatility reduce conviction.
- Attractive RRR / low risk per trade adds a few points; poor RRR subtracts.
- Excessive price drift nudges the score back toward neutral.
- Legacy hooks for funding/OI remain in the code path but are currently unused (their fields are `null`).
- Each adjustment appends a short reason (max 5) that is exposed via `/api/dev/sentiment/test` and the setup payload.

### Configuration

- `SENTIMENT_PROVIDER_MODE=internal` (default) — enables the heuristic provider for all assets.
- `SENTIMENT_PROVIDER_MODE=none` — disables provider usage; the engine falls back to the hash-based placeholder defined in `sentimentScoring`.

To add a new provider later:
1. Implement `SentimentProvider.fetchSentiment({ asset, context })` and return a `SentimentRawSnapshot`.
2. Register the provider inside `src/server/sentiment/providerResolver.ts` (possibly guarded by a new mode/env flag).
3. Extend this document and `.env.local.example` with the required configuration so it is discoverable for future developers.
