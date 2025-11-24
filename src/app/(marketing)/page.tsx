import React from "react";
import type { JSX } from "react";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { CTA } from "./components/CTA";
import { SetupCard } from "./components/SetupCard";
import { SetupOfTheDayCard } from "./components/SetupOfTheDayCard";

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

const mockSetups: Setup[] = [
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
];

export default function MarketingPage(): JSX.Element {
  const [setupOfTheDay, ...otherSetups] = mockSetups;

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:py-12">
        <Hero />
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-4">
            <SetupOfTheDayCard setup={setupOfTheDay} />
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Weitere Setups heute
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {otherSetups.slice(0, 3).map((setup) => (
                <SetupCard key={setup.id} setup={setup} />
              ))}
            </div>
          </div>
        </section>
        <Features />
        <CTA />
      </div>
    </div>
  );
}
