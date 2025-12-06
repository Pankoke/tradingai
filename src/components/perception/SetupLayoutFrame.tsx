"use client";

import type { JSX, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PerceptionCard } from "@/src/components/perception/PerceptionCard";

type SetupLayoutFrameProps = {
  header?: ReactNode;
  decision: ReactNode;
  drivers: ReactNode;
  details: ReactNode;
  className?: string;
};

export function SetupLayoutFrame({
  header,
  decision,
  drivers,
  details,
  className,
}: SetupLayoutFrameProps): JSX.Element {
  return (
    <PerceptionCard className={cn("p-0", className)} innerClassName="p-6 space-y-8">
      {header && <div className="space-y-4">{header}</div>}

      <section className="space-y-8 border-b border-slate-800/60 pb-2">{decision}</section>

      <section className="space-y-8">{drivers}</section>

      <section className="space-y-8">{details}</section>
    </PerceptionCard>
  );
}
