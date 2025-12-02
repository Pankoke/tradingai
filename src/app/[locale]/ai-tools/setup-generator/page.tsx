"use client";

import React from "react";
import type { SearchParams } from "next/navigation";
import { SetupGeneratorClient } from "@/src/features/setup-generator/feature";

type PageProps = {
  params: {
    locale: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

function toURLSearchParams(searchParams: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) {
          params.append(key, item);
        }
      });
      return;
    }
    if (value != null) {
      params.set(key, value);
    }
  });
  return params;
}

export default function SetupGeneratorPage({ params, searchParams }: PageProps) {
  const initialSearchParams = toURLSearchParams(searchParams);
  return (
    <SetupGeneratorClient
      locale={params.locale}
      initialSearchParams={initialSearchParams}
    />
  );
}
