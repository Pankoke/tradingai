Crypto Swing – Klassen-Playbook (Option A)

Status: verbindlich
Scope: Asset-Klasse „Crypto“ (BTC, ETH, SOL, …)
Ebene: Decision / Trade-Freigabe
Nicht enthalten: Asset-spezifische Schwellen (Option B)

1. Zweck des Klassen-Playbooks

Dieses Dokument definiert ein einheitliches Entscheidungs-Regelwerk für Swing-Trades in Kryptowährungen.

Ziel ist nicht, Trades zu generieren, sondern:

ungeeignete Marktphasen systematisch auszuschließen

geeignete Phasen klar zu markieren

eine einheitliche Decision-Logik für:

Snapshot-Build

Phase0

Premium-UI

Monitoring & Reports

sicherzustellen.

Dieses Playbook ist die Single Source of Truth für die Frage:

„Darf in Crypto aktuell geswingt werden?“

2. Grundannahmen (fachlich, nicht technisch)
2.1 Crypto ist regime-sensitiv

Swing-Trades funktionieren nur in klaren Trend-Phasen

Range / Chop führt überdurchschnittlich zu Verlusten

Volatilität allein ist kein Qualitätsmerkmal

Folge:
Das Markt-Regime ist ein hartes Vorfilter-Kriterium.

2.2 Confirmation ist zwingend erforderlich

Crypto zeigt häufig starke Preisbewegungen ohne Commitment

Ohne Bestätigung (Orderflow / Momentum) sind Breakouts unzuverlässig

Folge:
Trend ohne Confirmation ist kein Trade, sondern maximal Beobachtung.

2.3 Risiko-Struktur ist nicht verhandelbar

Schlechte RRR oder unplausible Levels sind kein Upgrade-Kandidat

Diese Fälle sollen klar ausgeschlossen werden

Folge:
Strukturell schlechte Setups sind NO_TRADE, nicht WATCH.

3. Decision-Kategorien (verbindlich)

Das Klassen-Playbook darf nur folgende Decisions erzeugen:

Decision	Bedeutung
TRADE	Marktbedingungen erlauben einen Swing-Trade
WATCH	Marktbedingungen sind aktuell ungeeignet, aber beobachtenswert
NO_TRADE	Setup ist strukturell ungeeignet
BLOCKED	Nur bei harten externen Ausschlussgründen (z. B. Datenfehler, Stale)

Wichtig:
Für Crypto sollen keine harten BLOCKED-Entscheidungen aus Marktlogik entstehen.
Markt-bedingte Ablehnung ist immer WATCH oder NO_TRADE.

4. Entscheidungs-Gates (verbindliche Reihenfolge)

Die Entscheidung erfolgt sequenziell über folgende Gates.
Das erste nicht erfüllte Gate beendet die Entscheidung.

Gate 1: Markt-Regime

Frage:

Befindet sich der Markt in einem klaren TREND-Regime?

❌ Nein → Decision = WATCH
Reason: „Regime range / chop“

✅ Ja → weiter zu Gate 2

Begründung:
Range-Phasen sind ungeeignet für Swing, aber relevant zur Beobachtung.

Gate 2: Trend-Qualität

Frage:

Ist der Trend ausreichend stark für Swing-Continuation?

❌ Nein → Decision = WATCH
Reason: „Trend too weak“

✅ Ja → weiter zu Gate 3

Gate 3: Confirmation (Orderflow / Momentum)

Frage:

Wird die Trend-Richtung bestätigt?

❌ Nein → Decision = WATCH
Reason: „Confirmation failed / chop“

✅ Ja → weiter zu Gate 4

Gate 4: Risiko-Struktur (Levels & RRR)

Frage:

Ist das Risiko-/Chance-Verhältnis strukturell sinnvoll?

❌ Nein → Decision = NO_TRADE
Reason: „Invalid RRR / levels“

✅ Ja → weiter zu Gate 5

Gate 5: Trade-Freigabe

Wenn alle vorherigen Gates erfüllt sind:

Decision = TRADE

Default Grade = B

Grade A ist nicht Teil dieses Dokuments
(A-Upgrades erfolgen später asset-spezifisch in Option B)

5. WATCH ist ein aktiver Zustand (wichtig!)

WATCH bedeutet nicht:

„schlecht“

„ignorieren“

„Fehler“

WATCH bedeutet:

„Fast richtig – aber aktuell fehlt ein entscheidendes Marktmerkmal.“

WATCH-Setups sind:

Kandidaten für WATCH+

Kandidaten für Upgrade bei neuem Snapshot

zentrale Beobachtungs-Kohorte in Phase0 & Reports

6. Explizit NICHT Teil dieses Playbooks

Dieses Dokument legt bewusst nicht fest:

numerische Schwellenwerte (z. B. Trend ≥ X)

Asset-Spezifika (BTC ≠ ETH)

Timeframe-Abweichungen

Volatilitäts-Profile

➡️ All das folgt in Option B (Asset-Profile).

7. Verbindlichkeit & Guardrails

Dieses Klassen-Playbook ist verbindlich für alle Crypto-Assets

Abweichungen dürfen nur über Asset-Profile erfolgen

Phase0, UI, Reports dürfen keine eigene Crypto-Decision-Logik enthalten

Jede Entscheidung muss auf dieses Regelwerk zurückführbar sein

8. Kurzfassung (für Codex)

Crypto Swing darf nur gehandelt werden, wenn:

Regime = TREND

Trend ausreichend stark

Confirmation vorhanden

RRR & Levels valide

Alles andere ist WATCH oder NO_TRADE, niemals „zufällig BLOCKED“.