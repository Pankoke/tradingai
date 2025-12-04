"use client";

import React, { useEffect, useState } from "react";
import type { JSX } from "react";
import { useSearchParams } from "next/navigation";
import { FormState, GeneratedSetup } from "@/src/features/setup-generator/types";
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
  const searchParams = useSearchParams();

  useEffect(() => {
    const assetParam = initialSearchParams.get("asset") ?? searchParams.get("asset");
    setForm((prev) => ({
      ...prev,
      asset: assetParam ?? prev.asset,
    }));
  }, [searchParams, initialSearchParams]);

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
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Setup Generator</p>
          <p className="text-xs text-slate-500">Locale: {locale}</p>
          <p className="text-xs text-slate-500">
            Current selection: {form.asset} · {form.timeframe} · {form.riskProfile}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:bg-slate-700"
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
          >
            {isLoading ? "Generating…" : "Generate setup"}
          </button>
          <button
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200"
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
          {result ? (
            <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <p className="text-slate-500">No setup generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
