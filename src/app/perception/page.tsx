import React from "react";
import type { JSX } from "react";
import { SetupCard } from "../(marketing)/components/SetupCard";

type Direction = "Long" | "Short";

type Setup = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: Direction;
  confidence: number;
  eventScore: number;
  biasScore: number;
  sentimentScore: number;
  balanceScore: number;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  type: "Regelbasiert" | "KI";
};

const todaysSetups: Setup[] = [
  {
    id: "setup-of-the-day",
    symbol: "WTI Crude",
    timeframe: "D1",
    direction: "Long",
    confidence: 87,
    eventScore: 78,
    biasScore: 82,
    sentimentScore: 69,
    balanceScore: 74,
    entryZone: "82.40 – 83.10",
    stopLoss: "80.90",
    takeProfit: "87.50",
    type: "Regelbasiert",
  },
  {
    id: "btc-long",
    symbol: "BTCUSD",
    timeframe: "H4",
    direction: "Long",
    confidence: 81,
    eventScore: 72,
    biasScore: 85,
    sentimentScore: 63,
    balanceScore: 70,
    entryZone: "64.800 – 65.400",
    stopLoss: "63.700",
    takeProfit: "69.000",
    type: "KI",
  },
  {
    id: "eth-short",
    symbol: "ETHUSD",
    timeframe: "H1",
    direction: "Short",
    confidence: 76,
    eventScore: 68,
    biasScore: 71,
    sentimentScore: 59,
    balanceScore: 67,
    entryZone: "3.120 – 3.160",
    stopLoss: "3.210",
    takeProfit: "2.980",
    type: "Regelbasiert",
  },
  {
    id: "nasdaq-long",
    symbol: "NAS100",
    timeframe: "M30",
    direction: "Long",
    confidence: 73,
    eventScore: 65,
    biasScore: 77,
    sentimentScore: 58,
    balanceScore: 66,
    entryZone: "18.420 – 18.480",
    stopLoss: "18.320",
    takeProfit: "18.780",
    type: "Regelbasiert",
  },
  {
    id: "dax-long",
    symbol: "DAX40",
    timeframe: "H1",
    direction: "Long",
    confidence: 69,
    eventScore: 61,
    biasScore: 72,
    sentimentScore: 55,
    balanceScore: 63,
    entryZone: "18.050 – 18.120",
    stopLoss: "17.960",
    takeProfit: "18.380",
    type: "Regelbasiert",
  },
  {
    id: "gold-short",
    symbol: "XAUUSD",
    timeframe: "H4",
    direction: "Short",
    confidence: 71,
    eventScore: 66,
    biasScore: 69,
    sentimentScore: 57,
    balanceScore: 64,
    entryZone: "2.415 – 2.428",
    stopLoss: "2.438",
    takeProfit: "2.372",
    type: "KI",
  },
];

export default function PerceptionPage(): JSX.Element {
  const [firstSetup, ...otherSetups] = todaysSetups;

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-10">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Perception – Tägliche Setups
          </h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            Hier siehst du eine Auswahl der heutigen Perception-Setups. Die
            vollständige Version wird später über die Premium-Ansicht mit
            Historie, Filtern und Alerts verfügbar sein. Alle Daten sind aktuell
            noch Mock-Daten und dienen als UI-Referenz.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
            Setup des Tages
          </h2>
          <SetupCard setup={firstSetup} highlight />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-sm font-semibold tracking-tight sm:text-base">
                Alle heutigen Setups (Vorschau)
              </h2>
              <p className="text-xs text-[var(--text-secondary)] sm:text-sm">
                Diese Ansicht zeigt eine begrenzte Anzahl von Setups. In der
                Premium-Version werden zusätzliche Filter, mehr Assets und eine
                Historie verfügbar sein.
              </p>
            </div>
            <div className="text-[0.7rem] text-[var(--text-secondary)]">
              Hinweis: Mock-Daten – Engine und Live-Daten folgen.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherSetups.map((setup) => (
              <SetupCard key={setup.id} setup={setup} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
