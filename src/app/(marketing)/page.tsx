import React from "react";
import type { JSX } from "react";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { CTA } from "./components/CTA";
import { SetupCard } from "./components/SetupCard";
import { SetupOfTheDayCard } from "./components/SetupOfTheDayCard";
import { mockSetups } from "../../lib/mockSetups";

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
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span className="text-[var(--accent)]">➜</span>
              <span>Weitere Setups</span>
            </div>
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
