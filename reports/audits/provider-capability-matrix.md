# Provider Capability Matrix

Generated: 2026-02-08  
Scope: Repo-interne Analyse (Code + DB read-only Audit), keine externen Calls.

## 1) Methodik

- Code-Inventar per `rg` in `src/server/marketData`, `src/server/providers`, `src/features/marketData`, `src/app/api/cron/marketdata/*`, `scripts/*`.
- Praxis-Sicht aus DB via `npm run audit:candles` (`scripts/auditCandleAvailability.ts`) und Report `reports/audits/candle-availability.md` (inkl. neuer Source-Summary).
- Matrix-Status:
  - `Configured`: im Codepfad vorgesehen
  - `Observed`: in DB (`candles.source`) in den letzten 60 Tagen gesehen
  - `Missing`: im Scope nicht beobachtet

## 2) Provider-Inventar (Fundstellen)

| Provider/Source | Typ | Hauptdateien |
| --- | --- | --- |
| Yahoo | Marketdata Candles | `src/server/providers/yahooMarketDataProvider.ts` |
| TwelveData | Marketdata Candles | `src/server/marketData/twelvedataMarketDataProvider.ts` |
| Finnhub | Marketdata Candles (Fallback) | `src/server/marketData/finnhubMarketDataProvider.ts` |
| Binance | Marketdata Candles (Crypto) | `src/server/marketData/binanceMarketDataProvider.ts` |
| Derived | 1H -> 4H Aggregation | `src/server/marketData/deriveTimeframes.ts`, `src/server/marketData/derived-config.ts` |
| Resolver/Orchestrierung | Provider-Priorität/Fallback | `src/server/marketData/providerResolver.ts`, `src/features/marketData/syncDailyCandles.ts` |
| Symbol-Display Mapping | Provider-spezifische Symboldarstellung | `src/server/marketData/providerDisplay.ts`, `src/server/marketData/assetProviderMapping.ts` |
| Candle Persistenz + Source | DB SoT | `src/server/repositories/candleRepository.ts`, `src/server/db/schema/candles.ts` |

Hinweis: `polygon` ist als Typ enthalten (`src/server/marketData/MarketDataProvider.ts:6`), aber ohne aktive Provider-Implementierung/Resolver-Nutzung im aktuellen Repo.

## 3) Datenarten & Timeframes (Code vs Callsites)

### Provider-Fähigkeiten im Code

- **Yahoo**
  - Candles nur `1D` (`src/server/providers/yahooMarketDataProvider.ts:42`, `src/server/providers/yahooMarketDataProvider.ts:49`).
- **TwelveData**
  - Candles für `1H`, `4H`, `15m`, `1D`, `1W` über Interval-Mapping (`src/server/marketData/twelvedataMarketDataProvider.ts:11`).
- **Finnhub**
  - Candles für `1H`, `4H`, `15m`, `1D`, `1W` via Resolution (`src/server/marketData/finnhubMarketDataProvider.ts:26`).
- **Binance**
  - Candles für `15m`, `1H`, `4H`, `1D`, `1W` (Crypto-only Guard) (`src/server/marketData/binanceMarketDataProvider.ts:25`, `src/server/marketData/binanceMarketDataProvider.ts:44`).
- **Derived**
  - Explizit nur `1H -> 4H` (`src/server/marketData/derived-config.ts:9`, `src/server/marketData/derived-config.ts:11`).

### Tatsächlich abgefragte Timeframes (Callsites)

- Daily Cron: `1D` + `1W` (`src/app/api/cron/marketdata/sync/route.ts:42`, `src/app/api/cron/marketdata/sync/route.ts:43`).
- Intraday Cron:
  - fetch-Pfad nur `1H`/`15m` (`src/app/api/cron/marketdata/intraday/route.ts:99`)
  - plus derive `4H` (`src/app/api/cron/marketdata/intraday/route.ts:165`).
- Asset/Timeframe-Konfiguration:
  - Standard Swing-Core `1D/1W`, Refinement `4H` (`src/server/marketData/timeframeConfig.ts:6`, `src/server/marketData/timeframeConfig.ts:7`)
  - Intraday-Fenster über Whitelist + `1H/4H` (`src/server/marketData/timeframeConfig.ts:10`, `src/server/marketData/timeframeConfig.ts:40`).

## 4) Symbol-/Asset-Mapping (konkrete Beispiele)

### TwelveData Mapping

Quelle: `src/server/marketData/twelvedataMarketDataProvider.ts:40`

- Gold: `GC=F` / `GOLD` / `XAUUSD` -> `XAU/USD`
- Silver: `SI=F` / `SILVER` -> `XAG/USD`
- WTI: `CL=F` / `WTI` -> `WTI/USD`
- FX: `GBPUSD=X` -> `GBP/USD`, `USDJPY=X` -> `USD/JPY`, `EURUSD=X` -> `EUR/USD`, `EURJPY=X` -> `EUR/JPY`
- Crypto: BTC/ETH -> `BTC/USD`, `ETH/USD`
- Indizes (SPX/NDX/DAX/DOW): kein explizites Mapping (führt zu missing mapping/no data im TwelveData-Pfad).

### Finnhub Mapping

Quelle: `src/server/marketData/finnhubMarketDataProvider.ts:34`

- Crypto -> `BINANCE:BTCUSDT`, `BINANCE:ETHUSDT`
- Gold -> `OANDA:XAUUSD`
- FX mit Slash-Format wird normalisiert (`EUR/USD` -> `EURUSD`)
- Fallback sonst: Symbol as-is
- Endpoint ist `forex/candle` (`src/server/marketData/finnhubMarketDataProvider.ts:82`) -> implizit FX-zentrierter Pfad.

### Binance Mapping

Quelle: `src/server/marketData/MarketDataProvider.ts:25`, `src/server/marketData/assetProviderMapping.ts:9`

- Nur bei crypto-relevanten Symbolen (`...USD` -> `...USDT`), sonst `null`.

## 5) Prioritäten, Fallbacks, Key-Handling, Limits

### Resolver-Reihenfolge

Quelle: `src/server/marketData/providerResolver.ts:24`

- Intraday (`1H/4H/15m`): `primary=twelvedata`, `fallback=finnhub` (`src/server/marketData/providerResolver.ts:34-36`).
- Non-intraday default: `primary=yahoo`, `fallback=twelvedata` (`src/server/marketData/providerResolver.ts:41-42`).
- `MARKET_PROVIDER_MODE=binance`: nur non-intraday crypto kann `binance` primär werden (`src/server/marketData/providerResolver.ts:46`, `src/server/marketData/providerResolver.ts:49-51`).

### Missing-Key Verhalten

- TwelveData key fehlt -> skip fetch (`src/server/marketData/twelvedataMarketDataProvider.ts:82-84`).
- Finnhub key fehlt -> skip fetch (`src/server/marketData/finnhubMarketDataProvider.ts:69-72`).

### Implizite Free-/Safety-Guards im Code

- Request Throttling: default `maxPerMinute=90`, `maxPerRun=200`, Retry/Backoff bei `429` (`src/server/marketData/requestThrottler.ts:24-27`, `src/server/marketData/requestThrottler.ts:92-98`, `src/server/marketData/requestThrottler.ts:121-124`).
- Daily/Ops lookback clamp: default 5 Tage, max 30 (`src/app/api/cron/marketdata/sync/route.ts:12-13`, `src/app/api/admin/ops/marketdata/route.ts:29-30`).
- Sync-Fenster max 5 Jahre (`src/features/marketData/syncDailyCandles.ts:10`, `src/features/marketData/syncDailyCandles.ts:31-32`).
- Intraday Asset-Whitelist (Default): `BTC,ETH,GOLD` (`src/app/api/cron/marketdata/intraday/route.ts:23`).
- TwelveData output size default: 500 (`src/server/marketData/twelvedataMarketDataProvider.ts:103`).
- Swing-Refinement 1H ingest target-liste: `wti,silver,gbpusd,usdjpy,eth,gold` (`src/scripts/swingRefinement1hIngest.ts:4`).

## 6) Empirische Sicht (DB / candles.source)

Quelle: `reports/audits/candle-availability.md` (GeneratedAt `2026-02-08T16:50:27.510Z`), Abschnitt **Provider/Source Summary (last 60d)**.

Beobachtete Sources in letzten 60 Tagen (target assets):

- `yahoo`: breit auf `1D` (Indices, FX, Commodities, ETH)
- `twelvedata`: `1H` auf ETH/Gold/GBPUSD/USDJPY; historische `4H` auf ETH/Gold
- `derived`: `4H` auf ETH/Gold
- `binance`: historische `1H` für ETH (ältere Daten)
- `finnhub`: im Scope nicht beobachtet

## 7) Capability Matrix (Configured vs Observed)

Legende je Zelle: `Configured`, `Observed`, `Missing`

| Provider | Crypto 1H | Crypto 4H | Crypto 1D | Crypto 1W | FX 1H | FX 4H | FX 1D | FX 1W | Commodities 1H | Commodities 4H | Commodities 1D | Commodities 1W | Indices 1H | Indices 4H | Indices 1D | Indices 1W |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| yahoo | Missing | Missing | Configured+Observed | Configured (via 1D->1W aggregation path) | Missing | Missing | Configured+Observed | Configured (via 1D->1W aggregation path) | Missing | Missing | Configured+Observed | Configured (via 1D->1W aggregation path) | Missing | Missing | Configured+Observed | Configured (via 1D->1W aggregation path) |
| twelvedata | Configured+Observed | Configured+Observed (historical observed) | Configured (fallback path) | Configured (interval map) | Configured+Observed (GBPUSD/USDJPY) | Configured (not observed for target FX) | Configured (fallback path) | Configured (interval map) | Configured+Observed (Gold) | Configured+Observed (Gold historical) | Configured (fallback path) | Configured (interval map) | Configured (code-level) | Configured (code-level) | Configured (fallback path) | Configured (interval map) |
| finnhub | Configured (fallback) | Configured (fallback) | Configured (fallback) | Configured (fallback) | Configured (fallback) | Configured (fallback) | Configured (fallback) | Configured (fallback) | Configured (Gold mapping) | Configured (Gold mapping) | Configured (fallback) | Configured (fallback) | Configured (symbol as-is fallback) | Configured (symbol as-is fallback) | Configured (fallback) | Configured (fallback) |
| binance | Configured+Observed (historical ETH) | Configured | Configured (nur bei `MARKET_PROVIDER_MODE=binance`) | Configured (nur bei `MARKET_PROVIDER_MODE=binance`) | Missing | Missing | Missing | Missing | Missing | Missing | Missing | Missing | Missing | Missing | Missing | Missing |
| derived | Missing | Configured+Observed (`1H->4H`) | Missing | Missing | Missing | Configured (path vorhanden, aber target assets nicht observed) | Missing | Missing | Missing | Configured+Observed (Gold) | Missing | Missing | Missing | Configured (path vorhanden, aber target assets nicht observed) | Missing | Missing |

## 8) Constraints & Costs (aus Code ableitbar)

- **API-Key Pflicht**
  - TwelveData: `TWELVEDATA_API_KEY`
  - Finnhub: `FINNHUB_API_KEY`
  - JB-News Events (nicht Candle, aber Provider im Repo): `JB_NEWS_API_KEY` (`src/server/events/providers/jbNewsCalendarProvider.ts:51-53`)
- **Ohne Key:** Provider liefert leer/skip statt hard crash.
- **Kosten-/Quota-indizierte Schutzmechanismen**
  - RPM-/Run-Limits + Backoff/Retry (`requestThrottler`)
  - Intraday Asset-Whitelist
  - Lookback-Clamps (5/30 Tage in Cron/Ops)
  - Begrenzte Outputsize (TwelveData default 500)

## 9) Auffälligkeiten / Gaps

- `polygon` ist als Source-Typ geführt, aber ohne aktive Implementierung/Resolver-Nutzung.
- Indizes/WTI/Silver haben im DB-Snapshot keine 1H/4H-Werte; entsprechend fehlen dort observed intraday/refinement Candles.
- Finnhub ist als Intraday-Fallback verdrahtet, aber im beobachteten Zeitraum nicht als `candles.source` aufgetreten.
- Für `1W` gibt es primär einen Aggregationspfad aus `1D` (`aggregateWeeklyFromDaily`), kein dedizierter persistierter Provider-Beleg im aktuellen Audit-Scope.
