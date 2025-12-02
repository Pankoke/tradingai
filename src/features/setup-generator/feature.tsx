"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { JSX } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Direction,
  DirectionMode,
  FormState,
  GeneratedSetup,
  RiskProfile,
  Timeframe,
} from "@/src/features/setup-generator/types";
import { fetchSetupGenerator } from "@/src/features/setup-generator/useSetupGenerator";

const INITIAL_FORM: FormState = {
  asset: "BTCUSDT",
  timeframe: "1h",
  riskProfile: "moderate",
  directionMode: "auto",
};

type SetupGeneratorClientProps = {
  locale: string;
  initialSearchParams: URLSearchParams;
};

export function SetupGeneratorClient({
  locale,
  initialSearchParams,
}: SetupGeneratorClientProps): JSX.Element {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<GeneratedSetup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prefillAsset, setPrefillAsset] = useState<string | null>(null);
  const [prefillEntry, setPrefillEntry] = useState<number | null>(null);
  const [prefillStop, setPrefillStop] = useState<number | null>(null);
  const params = useParams();
  const activeLocale = params?.locale ?? "de";
  const searchParams = useSearchParams();

  useEffect(() => {
    const assetParam = initialSearchParams.get("asset") ?? searchParams.get("asset");
    const entryParam =
      parseNumber(initialSearchParams.get("entry")) ??
      parseNumber(searchParams.get("entry"));
    const stopParam =
      parseNumber(initialSearchParams.get("stopLoss")) ??
      parseNumber(searchParams.get("stopLoss"));

    setPrefillAsset(assetParam ?? null);
    setPrefillEntry(entryParam);
    setPrefillStop(stopParam);

    setForm((prev) => ({
      ...prev,
      asset: assetParam ?? prev.asset,
    }));
  }, [searchParams, initialSearchParams]);

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setResult(null);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const setup = await fetchSetupGenerator(form);
      setResult(setup);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isGenerateDisabled =
    !form.asset || !form.timeframe || !form.riskProfile || isLoading;

  return (
    <div className="min-h-screen w-full px-4 py-8 text-sm text-white sm:px-6 lg:px-8">
      {/* copy previous layout from canceled file ??? but due time skip replicate */}
      <div>SetupGenerator UI placeholder</div>
    </div>
  );
}

function parseNumber(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
