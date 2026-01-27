# BTC Swing – Playbook Inventory (Ist-Zustand)

Stand: 2026-01-27
Quelle: Code-Analyse (keine Ausfuehrung)

## 1) Playbooks / Resolver-Pfade (BTC Swing 1D)

### Registry / IDs
- Crypto Klassen-Playbook: `crypto-swing-v0.1` in `src/lib/engine/playbooks/index.ts`.
- Generisches Swing-Fallback: `generic-swing-v0.1` (nur wenn kein Match).

### Resolver-Reihenfolge (swing)
Aus `resolvePlaybookIdForAsset` in `src/lib/engine/playbooks/index.ts`:
1. SPX
2. DAX
3. NDX
4. DOW
5. GOLD
6. METALS
7. ENERGY
8. INDEX-Klasse
9. FX-asset-spezifisch (eurusd/gbpusd/usdjpy/eurjpy)
10. CRYPTO-Klasse (matchCryptoAsset)
11. FX-Klasse
12. GENERIC fallback

BTC Matching (swing):
- `matchCryptoAsset` matched, wenn Symbol `-USD` enthaelt oder mit `USD/USDT` endet.
- BTC? symbol Beispiele: `BTC-USD`, `BTCUSDT` => match -> `crypto-swing-v0.1`.
Fundstellen:
- `matchCryptoAsset` (Zeilen ~191–200)
- `resolvePlaybookIdForAsset` (Zeilen ~240–270)
- `CRYPTO_PLAYBOOK_ID` (Zeile ~76)

## 2) Gate-Reihenfolge (Crypto Swing Playbook)
Implementiert in `evaluateCryptoSwing` in `src/lib/engine/playbooks/index.ts` (Zeilen ~590–650):

Gate 1 – Regime (deriveRegimeTag)
- Regime != TREND => NO_TRADE, Reason "Regime range / chop"
- Debug: `crypto:g1_regime:<tag>`

Gate 2 – Trend
- trendScore >= 60 notwendig
- Fail => NO_TRADE, Reason "Trend too weak"
- Debug: `crypto:g2_trend`

Gate 3 – Confirmation
- confirmationScore >= 55 (orderflowScore oder orderflow.score)
- Fail => NO_TRADE, Reason "Confirmation failed / chop"
- Debug: `crypto:g3_confirmation`

Gate 4 – Risk/Levels
- entryZone/stopLoss/takeProfit vorhanden AND riskReward vorhanden
- rrr >= 1
- Fail => NO_TRADE, Reason "Invalid RRR / levels"
- Debug: `crypto:g4_risk[:levels_missing][:rrr_unattractive]`

Gate 5 – Trade
- Grade B, rationale: "Regime TREND", "Trend strong (>=60)", "Confirmation via orderflow (>=55)"
- Debug: `crypto:g5_trade`

Regime-Logik (helper):
- `deriveRegimeTag` in `src/lib/engine/metrics/regime.ts`.
- TREND wenn trend >= 60 und (momentum >= 55 oder driftPct >= 0). Momentum nutzt `rings.orderflowScore` falls vorhanden.

## 3) BTC-spezifische Schwellenwerte / Parameter
Aus `evaluateCryptoSwing`:
- Trend threshold: `trendScore >= 60`
- Confirmation threshold: `orderflowScore >= 55` (oder `orderflow.score`)
- Regime: TREND wenn trend >= 60 und momentum >= 55 oder driftPct >= 0 (siehe `deriveRegimeTag`)
- Risk/Levels: entry/stop/takeProfit + riskReward vorhanden
- RRR: `rrr >= 1` (sonst NO_TRADE)

Keine expliziten BTC-spezifischen Schwellen (nur Crypto-Klasse). BTC wird ueber Symbol-Match geroutet.

## 4) Reasons fuer NO_TRADE / WATCH / BLOCKED (BTC)

### Aus Playbook (NO_TRADE / TRADE)
`evaluateCryptoSwing` (src/lib/engine/playbooks/index.ts):
- NO_TRADE reasons:
  - "Regime range / chop"
  - "Trend too weak"
  - "Confirmation failed / chop"
  - "Invalid RRR / levels"
- TRADE rationale (Grade B):
  - "Regime TREND"
  - "Trend strong (>=60)"
  - "Confirmation via orderflow (>=55)"
- Debug reasons: `crypto:g1_regime:*`, `crypto:g2_trend`, `crypto:g3_confirmation`, `crypto:g4_risk:*`, `crypto:g5_trade`

### Decision-Layer (WATCH/BLOCKED) fuer Crypto
`deriveSetupDecision` in `src/lib/decision/setupDecision.ts`:
- WATCH enabled fuer `crypto-swing-v0.1` (siehe `watchEnabledPlaybookIds` in `src/lib/config/watchDecision.ts`).
- Crypto alignment fallback:
  - `deriveCryptoAlignmentReason()` -> "Alignment unavailable (crypto)".
- Falls alignment fehlt oder noTradeReason leer (und watchEnabled): Decision = WATCH, reasons enthalten "Alignment unavailable (crypto)" (siehe `isCryptoSwing` / `alignmentMissing` Branch).
- Falls NO_TRADE wegen "Invalid RRR / levels": wird zu WATCH soft mit Reason "Invalid RRR / levels".
- BLOCKED entsteht fuer crypto, wenn `watchEnabled` false oder `hard` true (hard KO z. B. stale / missing levels / execution_critical) und keine speziellen crypto-soft Regeln greifen.

Weitere Reason-Quellen:
- `buildReasons` nutzt `noTradeReason`, `gradeRationale`, `gradeDebugReason`.
- `hardReasonKeywords` / `softReasonKeywords` in `src/lib/config/watchDecision.ts` bestimmen Hard/Soft.

## 5) Diff vs Crypto Swing Klassen-Playbook (Dokument)
Quelle: `docs/playbooks/crypto-swing-class-playbook.md`

### Identisch (Logik/Struktur)
- Gate-Reihenfolge: Regime -> Trend -> Confirmation -> Risk/Levels -> Trade (Doc Kap. 4).
- RRR/Levels sind ausschliessend (NO_TRADE).
- Default Trade-Grade B.

### Abweichungen (Code vs Doc)
1) Decision-Kategorie bei Gate 1–3
   - Dokument: Gate 1–3 => WATCH (nicht NO_TRADE).
   - Code: Gate 1–3 => NO_TRADE.
   Fundstellen:
   - Doc Gate 1–3 (Kap. 4)
   - Code `evaluateCryptoSwing` returns NO_TRADE fuer Regime/Trend/Confirmation.

2) WATCH als aktiver Zustand
   - Dokument: WATCH ist aktiver Status fuer Marktbedingungen.
   - Code: Playbook liefert kein WATCH; WATCH entsteht spaeter in `deriveSetupDecision` (Decision-Layer), nicht im Playbook.
   Bewertung: strukturelle Abweichung zwischen Doc (Playbook erzeugt WATCH) und Code (Decision-Layer normalisiert).

3) BLOCKED Nutzung
   - Dokument: BLOCKED nur harte externe Ausschlussgruende; Marktlogik soll nie BLOCKED erzeugen.
   - Code: Hard-KO in `deriveSetupDecision` kann BLOCKED setzen (stale/missing levels/event_critical). Dies ist kompatibel, aber Check, ob Market-Logik in Decision-Layer triggers (z. B. `levelsMissing` als hard KO).

4) Schwellenwerte (nicht im Doc)
   - Doc sagt: keine numerischen Schwellenwerte (Option B),
   - Code nutzt konkrete Schwellen (trend>=60, confirmation>=55, rrr>=1, regime TREND via trend>=60 + momentum>=55/drift>=0).
   => Abweichung zu Doc Abs. 6 ("nicht Teil dieses Playbooks").

### Gewollt / Ungewollt (nur markiert)
- Gewollt? unklar: Doc verbietet Schwellenwerte; Code setzt harte Schwellen.
- Gewollt? unklar: WATCH/NO_TRADE wird im Decision-Layer, nicht im Playbook, erzeugt.

## 6) Risiken / Hinweise
- Decision entsteht in `deriveSetupDecision` (Setup Decision Layer), nicht im Playbook. Das kann zu Unterschiede zwischen Doc-Intent und Playbook-Output fuehren.
- BTC-spezifische Rules gibt es nicht; BTC folgt Crypto-Klasse.
- Report/Phase0 koennen weitere Reasons normalisieren (Alignment unavailable (crypto) etc.).

## 7) Fundstellen (Dateien)
- Playbook Registry + Crypto Playbook: `src/lib/engine/playbooks/index.ts`
- Regime Derivation: `src/lib/engine/metrics/regime.ts`
- Decision Normalization / WATCH: `src/lib/decision/setupDecision.ts`
- Watch enablement + keywords: `src/lib/config/watchDecision.ts`
- Dokument: `docs/playbooks/crypto-swing-class-playbook.md`
