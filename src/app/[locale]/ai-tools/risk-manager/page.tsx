"use client";

import React from "react";
import type { SearchParams } from "next/navigation";
import { RiskManagerClient } from "@/src/features/risk-manager/feature";

type PageProps = {
  params: {
    locale: string;
  };
  searchParams: SearchParams;
};

function toURLSearchParams(searchParams: SearchParams): URLSearchParams {
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

export default function RiskManagerPage({ params, searchParams }: PageProps) {
  const initialSearchParams = toURLSearchParams(searchParams);
  return (
    <RiskManagerClient
      locale={params.locale}
      initialSearchParams={initialSearchParams}
    />
  );
}
