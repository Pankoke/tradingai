const ENV_FLAG =
  typeof process !== "undefined"
    ? process.env.EVENT_MODIFIER_ENABLED ?? process.env.NEXT_PUBLIC_EVENT_MODIFIER_ENABLED
    : undefined;

export const isEventModifierEnabled = (): boolean => {
  if (ENV_FLAG === "0") return false;
  if (ENV_FLAG === "1") return true;
  return true;
};

export const isEventModifierEnabledClient = (): boolean => {
  if (typeof process === "undefined") return true;
  const raw = process.env.NEXT_PUBLIC_EVENT_MODIFIER_ENABLED ?? process.env.EVENT_MODIFIER_ENABLED;
  if (raw === "0") return false;
  if (raw === "1") return true;
  return true;
};
