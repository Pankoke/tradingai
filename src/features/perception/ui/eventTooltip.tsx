import type { Setup } from "@/src/lib/engine/types";
import type { JSX } from "react";

export type EventContext = Setup["eventContext"];

export function formatEventTime(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

type TranslateFn = (key: string, vars?: Record<string, string>) => string;

export function buildEventTooltip(
  baseTooltip: string,
  eventContext: EventContext | null | undefined,
  translate: TranslateFn,
): JSX.Element {
  const top = eventContext?.topEvents?.[0];
  const contextLine = top
    ? translate("perception.rings.tooltip.eventContext", {
        title: top.title ?? "n/a",
        time: formatEventTime(top.scheduledAt),
      })
    : null;

  return (
    <div className="flex flex-col gap-1 text-left">
      <p>{baseTooltip}</p>
      {contextLine ? <p className="text-xs text-slate-300">{contextLine}</p> : null}
    </div>
  );
}
