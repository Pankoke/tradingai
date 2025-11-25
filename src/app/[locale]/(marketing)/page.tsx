"use client";

import React, { useEffect, useState } from "react";
import type { JSX } from "react";
import { useT } from "../../../lib/i18n/ClientProvider";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { CTA } from "./components/CTA";
import { SetupCard } from "./components/SetupCard";
import { SetupOfTheDayCard } from "./components/SetupOfTheDayCard";
import { fetchTodaySetups } from "../../../lib/api/perceptionClient";
import type { Setup } from "../../../lib/engine/types";

export default function MarketingPage(): JSX.Element {
  const t = useT();
  const [setups, setSetups] = useState<Setup[]>([]);
  const [setupOfTheDayId, setSetupOfTheDayId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const { setups: fetchedSetups, setupOfTheDayId: id } = await fetchTodaySetups();
        setSetups(fetchedSetups);
        setSetupOfTheDayId(id);
      } catch (err) {
        console.error(err);
        setError(t("marketing.error"));
      } finally {
        setLoading(false);
      }
    };
    void load();
    // Intentionally no dependencies to avoid refetch loops caused by changing t reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-[var(--text-secondary)]">{t("marketing.loading")}</div>
      </div>
    );
  }

  if (error || setups.length === 0 || !setupOfTheDayId) {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-[var(--text-secondary)]">
          {error ?? t("marketing.noSetups")}
        </div>
      </div>
    );
  }

  const setupOfTheDay = setups.find((setup) => setup.id === setupOfTheDayId);
  const otherSetups = setups.filter((setup) => setup.id !== setupOfTheDayId).slice(0, 3);

  if (!setupOfTheDay) {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-[var(--text-secondary)]">
          {t("marketing.noSetupOfDay")}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:py-12">
        <Hero />
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <SetupOfTheDayCard setup={setupOfTheDay} />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span className="text-[var(--accent)]">{t("setups.moreSetupsArrowHint")}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherSetups.map((setup) => (
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
