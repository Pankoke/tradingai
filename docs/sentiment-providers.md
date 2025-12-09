## Sentiment Providers

The application currently ships with a single internal sentiment provider. It returns a neutral placeholder signal so that the perception pipeline keeps working even without external funding/open-interest feeds.

### Internal Provider

- **Source**: `src/server/sentiment/internalSentimentProvider.ts`
- **Behavior**: always returns a neutral score (50) with a single reason `"Internal sentiment placeholder – no external provider configured"`.
- **Configuration**:
  - `SENTIMENT_PROVIDER_MODE=internal` (default) → neutral sentiment is attached to every asset.
  - `SENTIMENT_PROVIDER_MODE=none` → sentiment is disabled; the engine will fall back to the hash-based default in `sentimentScoring`.

### Extending in the Future

To add a real provider:

1. Implement `SentimentProvider` with a `fetchSentiment({ asset })` method that produces a `SentimentRawSnapshot`.
2. Register it in `src/server/sentiment/providerResolver.ts`, potentially controlled by a new `SENTIMENT_PROVIDER_MODE`.
3. Update this document and any relevant `.env` examples so the configuration is discoverable.
