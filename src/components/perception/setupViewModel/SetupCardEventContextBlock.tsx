"use client";

import type { JSX } from "react";
import { EventMicroTimingStrip } from "@/src/components/perception/EventMicroTimingStrip";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";

type Props = {
  setup: SetupViewModel;
};

export function SetupCardEventContextBlock({ setup }: Props): JSX.Element | null {
  if (!setup.eventContext) return null;
  return <EventMicroTimingStrip eventContext={setup.eventContext} />;
}
