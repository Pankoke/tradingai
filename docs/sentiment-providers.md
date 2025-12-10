## Sentiment Providers

Die Perception-Engine nutzt derzeit ausschließlich den internen Heuristik-Provider. Externe Feeds (Coinglass/Binance) sind entfernt, die Abstraktion (`SentimentProvider` + Resolver) bleibt bestehen, sodass später neue Quellen angeschlossen werden können.

### Interner Heuristik-Provider

- **Ort**: `src/server/sentiment/internalSentimentProvider.ts`
- **Inputs** (alle optional, je nach verfügbarem Kontext):
  - normalisierte Bias-Werte aus den Bias-Snapshots
  - Trend-, Momentum-, Volatilitäts- und Drift-Signale aus `marketMetrics`
  - Orderflow-Proxy (aktuell Momentum Score)
  - Event-Risiko aus dem Event-Ring
  - Risk/Reward (RRR, Risk%, Volatilitäts-Label)
- **Output**: `SentimentRawSnapshot` mit oben genannten Feldern plus Debug-Metadaten (`source="internal_heuristic"`, `profileKey`, `baseScore`).

### Sentiment-Profile & Heuristik

`buildSentimentMetrics` (`src/lib/engine/sentimentMetrics.ts`) konsumiert das Snapshot und erzeugt:

- einen Score **0–100**
- ein Label (`extreme_bearish` … `extreme_bullish`)
- eine Reason-Liste (max. 6 Einträge)
- optional `contributions`: Liste einzelner Faktor-Adjustments (Bias, Trend, Momentum, Event, RRR, Risiko, Volatilität, Drift)

Die Heuristik basiert auf Profilen pro Asset-Klasse:

| Profil     | Besonderheiten                                                   |
|------------|------------------------------------------------------------------|
| default    | Balanced Weights, Basis 50                                       |
| crypto     | Momentum/Bias stärker, Event-/Volatilitäts-Abschläge kleiner     |
| fx         | Event-Risiko stärker, RRR-Anforderungen niedriger                |
| index      | Trend-Bonus reduziert, Volatilität etwas sensibler               |
| commodity  | Event-Kalender wichtiger (Calm-Bonus erhöht)                     |

Score-Beispiele (Standard-Profil):

| Score        | Label             |
|--------------|-------------------|
| 0–20         | `extreme_bearish` |
| 21–40        | `bearish`         |
| 41–60        | `neutral`         |
| 61–80        | `bullish`         |
| 81–100       | `extreme_bullish` |

### Konfiguration

- `SENTIMENT_PROVIDER_MODE=internal` (Default)
  - Interner Heuristik-Provider für alle Assets.
- `SENTIMENT_PROVIDER_MODE=none`
  - Provider wird übersprungen; die Engine fällt auf den Hash-basierten Fallback in `sentimentScoring` zurück.

### Debug & Dev-Selfcheck

`/api/dev/sentiment/test?symbol=BTC-USD` liefert:

- `sentiment`: Score, Label, Reasons, Contributions
- `raw`: Snapshot inkl. Profil-Key und genutzten Input-Werten
- `inputs`: normalisierte Werte (`usedBias`, `usedTrend`, …)
- `debug`: Provider-Hinweise

So lassen sich die Profile schnell feinjustieren, ohne die UI anzupassen.

### Neue Provider hinzufügen

1. `SentimentProvider.fetchSentiment({ asset, context })` implementieren, `SentimentRawSnapshot` zurückgeben.
2. Provider im Resolver (`src/server/sentiment/providerResolver.ts`) registrieren und per Env-Flag auswählbar machen.
3. Diese Dokumentation und `.env.local.example` aktualisieren.
