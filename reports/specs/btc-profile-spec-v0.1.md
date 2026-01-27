# BTC Profile Spec v0.1 (offensiv)

Status: Draft Spec (implementation-ready)
Scope: BTC Swing (1D/1W), Snapshot-Build Decision (persisted)
Decision contract: decision, decisionSegment, decisionReasons, decisionVersion are persisted at snapshot build. No recompute in Phase0/UI/Reports.

---

## 0) IST-Stand (kurz, belegt)

Quelle: `reports/audits/btc-playbook-inventory.md`

### Routing
- BTC Swing wird aktuell ueber `crypto-swing-v0.1` geroutet.
- Resolver: `src/lib/engine/playbooks/index.ts` -> `matchCryptoAsset` (BTC-USD / BTCUSDT) -> `cryptoSwingPlaybook`.

### Gates & Schwellenwerte (Playbook-Ebene)
Aus `evaluateCryptoSwing` (Codepfad in `src/lib/engine/playbooks/index.ts`):
1) Regime: `deriveRegimeTag` muss `TREND` sein.
2) Trend: `trendScore >= 60`.
3) Confirmation: `orderflowScore >= 55`.
4) Risk/Levels: entry/stop/takeProfit vorhanden und `rrr >= 1`.
5) Trade-Freigabe: Grade `B`.

Reasons (NO_TRADE):
- "Regime range / chop"
- "Trend too weak"
- "Confirmation failed / chop"
- "Invalid RRR / levels"

### Decision Mapping (Decision-Layer)
Aus `src/lib/decision/setupDecision.ts` + `src/lib/config/watchDecision.ts`:
- `crypto-swing-v0.1` ist watch-enabled.
- Decision kann im Decision-Layer zu WATCH normalisiert werden, z. B. bei Alignment-Fehlen.
- Hard KO (stale/levels missing/exec critical) kann BLOCKED ausloesen.

### Monitoring/Reports
- Phase0 Payload: `/api/admin/playbooks/phase0-gold-swing` (BTC Summaries, alignment reasons, distributions).
- Weekly Report: `scripts/build-weekly-health-report.ts` rendert per-asset Sektionen.
- Decision Contract: `reports/architecture/decision-single-source.md`.

---

## 1) Design Goal (offensiv)

Ziel: Fuer BTC Swing (1D/1W) mehr TRADE/WATCH+ und weniger BLOCKED durch weiche Gruende, ohne Hard-Risiko zu ignorieren.

Leitgedanke: Marktbedingte Ablehnungen (Regime/Trend/Confirmation) sollen primär WATCH/WATCH_PLUS sein, nicht NO_TRADE/BLOCKED.

---

## 2) Minimaler Diff gegen Crypto Class

Maximal 2–3 gezielte Anpassungen fuer BTC, ohne neue Decision-Kategorien.

### A) Regime/Trend/Confirmation -> WATCH (statt NO_TRADE)
- Wenn Gate 1–3 nicht erfuellt, Decision = WATCH (nicht NO_TRADE).
- Reasons bleiben identisch (Regime/Trend/Confirmation), aber Decision-Ebene = WATCH.

### B) Risiko-Struktur bleibt NO_TRADE
- Gate 4 (Levels/RRR) bleibt NO_TRADE (strukturell ungeeignet).
- Rationale unveraendert: "Invalid RRR / levels".

### C) Trade-Freigabe unveraendert
- Gate 5 bleibt TRADE (Grade B), keine A-Upgrades in v0.1.

---

## 3) Gate-Definitionen (BTC v0.1 offensiv)

Reihenfolge: Regime -> Trend -> Confirmation -> Risk/Levels -> TRADE

**Gate 1: Regime**
- Condition: `deriveRegimeTag(...) === TREND`
- Fail: Decision = WATCH
- Reason: "Regime range / chop"

**Gate 2: Trend**
- Condition: `trendScore >= 60`
- Fail: Decision = WATCH
- Reason: "Trend too weak"

**Gate 3: Confirmation**
- Condition: `orderflowScore >= 55`
- Fail: Decision = WATCH
- Reason: "Confirmation failed / chop"

**Gate 4: Risk/Levels**
- Condition: entry/stop/takeProfit vorhanden AND `rrr >= 1`
- Fail: Decision = NO_TRADE
- Reason: "Invalid RRR / levels"

**Gate 5: Trade**
- Condition: alle Gates erfuellt
- Decision = TRADE, Grade = B
- Grade rationale: "Regime TREND", "Trend strong (>=60)", "Confirmation via orderflow (>=55)"

---

## 4) Decision Mapping (BTC spezifisch)

- WATCH fuer marktbedingte Ablehnung (Regime/Trend/Confirmation).
- NO_TRADE fuer strukturelle Ablehnung (RRR/Levels).
- BLOCKED nur fuer harte externe Gruende (stale/missing levels/exec critical), nicht fuer Marktlogik.
- WATCH_PLUS bleibt moeglich, wenn Decision-Layer es explizit erhoeht (keine neue Logik in v0.1).

**Soft vs Hard**
- Soft reasons: regime/confirmation/trend/alignment.
- Hard reasons: stale/missing/invalid/knockout (bestehende hardReasonKeywords).

---

## 5) Messkriterien (Phase0 / Weekly)

Erwartete Richtung (30–60 Tage Fenster):
- TRADE Anteil: ?
- WATCH/WATCH_PLUS Anteil: ?
- BLOCKED Anteil: ?
- NO_TRADE Anteil: stabil oder ? (nur strukturelle Risiken)

Konkrete Kennzahlen (Phase0/Weekly):
- Decision Distribution (BTC): TRADE/WATCH/WATCH_PLUS/BLOCKED
- NO_TRADE Reasons (sollte stark auf "Invalid RRR / levels" konzentriert sein)
- WATCH Reasons (Regime/Trend/Confirmation dominant)

---

## 6) Implementation Plan (nur Struktur)

### Vermutliche Aenderungen
- `src/lib/engine/playbooks/index.ts`
  - BTC-spezifisches Playbook oder BTC-Branch innerhalb `evaluateCryptoSwing`.
- `src/lib/decision/setupDecision.ts`
  - Sicherstellen: BTC WATCH/WATCH+ passt zu Decision contract (persisted).
- `src/lib/config/watchDecision.ts`
  - BTC spezifische watch requirements falls notwendig (nur wenn minimal).
- `src/app/api/admin/playbooks/phase0-gold-swing/route.ts`
  - Optional: BTC-spezifische debugMeta/sections (nur wenn wirklich benoetigt).

### Tests
- Unit-Test fuer BTC Playbook:
  - Regime != TREND => WATCH
  - Trend fail => WATCH
  - Confirmation fail => WATCH
  - Invalid RRR => NO_TRADE
  - All pass => TRADE (Grade B)
- Decision Contract Tests:
  - Persisted decision reasons are passed through (no recompute).

---

## 7) Notes
- Keine Aenderung an Crypto Class fuer andere Assets in v0.1.
- BTC-Profile ist additive Spezialisierung (Option B), nicht globaler Umbau.

