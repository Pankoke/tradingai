## Phase-1 State Verification (v1) — Stand: aktueller Repo + Artefakte

Kurzfassung:
- buildSetups.ts setzt Playbook vor Decision-Berechnung und persistiert für Swing (1D/1W) die resolver-Ergebnisse; generic-Guard greift nur zur Sicherheit, kein späteres Überschreiben gefunden (Fundstelle: src/features/perception/build/buildSetups.ts:197ff, setupPlaybookId=playbook.id Zeile ~299).
- Keine weiteren generic-Pfade in Swing gefunden (Search “generic-swing” nur einmal im Guard; Intraday bleibt separat).
- Neuester Swing Outcome Report (artifacts/phase1/swing-outcome-analysis-2026-01-22T15-17-45.037Z-v1.md) zeigt für WTI/Silver nur energy-/metals-swing-v0.1, keine generic-Zeilen; fallbackUsedCount=0, Persistenz-only aktiv.
- Persisted Dimensions vorhanden (playbookId/grade/decision) laut phase1-linking.md und Analyzer-Konfiguration (allowDerivedPlaybookFallback=false).
- Offene Outcomes: 5 total, alle open (WTI/Silver), daher winrate n/a — erwartbar, nicht Playbook-bedingt.

Antworten auf Analysefragen:

A) Persistenz & Build
1) Ja. In buildSetups.ts wird das Playbook über resolvePlaybookWithReason gesetzt, und setupPlaybookId=playbook.id geschrieben (Zeile ~299). Ein Guard verhindert generic für Swing-WTI/Silver; Decision beeinflusst das Playbook nicht.
2) Nein für Swing: Es gibt nur den Guard (Zeile ~197), keine weiteren generic-Zuweisungen. Intraday bleibt separat (Profile-Derivation).

B) Datenstand (Artefakt)
3) Neuester Report (2026-01-22T15-17-45.037Z, days=30): WTI/Silver Zeilen haben playbookId energy-swing-v0.1 bzw. metals-swing-v0.1, alle Decision=“pullback_continuation”, Grade=B, Outcomes open.
4) Keine generic-swing-v0.1 Zeilen im Report für WTI/Silver.

C) Phase-1 Readiness
5) Ja, technisch konsistent: Persisted dimensions aktiv, Analyzer persisted-only, fallbackUsedCount=0.
6) Abgeschlossen: Persistenz, Analyzer persisted-only, Playbook-Coverage Swing. Out of scope: Viele Outcomes noch open (Outcome-Evaluate Limit/Frequenz), Intraday bleibt generic. Offen vor Phase-1.2: Outcome-Evaluate Frequenz/Limit prüfen, mehr Closed-Samples erzeugen.

Empfehlung/Nächste Schritte:
- Outcome-Evaluate häufiger oder mit höherem Limit ausführen, damit Open → Closed übergeht.
- Phase-1.2 kann auf aktueller Basis starten; keine Playbook-Gaps für Swing-WTI/Silver mehr sichtbar.
