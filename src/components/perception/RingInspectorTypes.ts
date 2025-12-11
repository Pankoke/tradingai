import type { Setup } from "@/src/lib/engine/types";
import type { RingInspectorVariant } from "@/src/components/perception/RingInspectorLayout";

export type RingInspectorBaseProps = {
  setup: Setup;
  variant?: RingInspectorVariant;
  className?: string;
};
