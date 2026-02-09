export type PerceptionDataMode = "live" | "mock";

export type SetupHeaderModeLabelKey = "setup.header.mode.live" | "setup.header.mode.mock";

export function resolvePerceptionDataMode(input?: string | null): PerceptionDataMode {
  return (input ?? "").toLowerCase() === "mock" ? "mock" : "live";
}

export function getPerceptionDataMode(): PerceptionDataMode {
  return resolvePerceptionDataMode(process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE);
}

export function getSetupHeaderModeLabelKey(mode: PerceptionDataMode): SetupHeaderModeLabelKey {
  return mode === "mock" ? "setup.header.mode.mock" : "setup.header.mode.live";
}

export function isPerceptionMockMode(): boolean {
  return getPerceptionDataMode() === "mock";
}

export function isPerceptionLiveMode(): boolean {
  return getPerceptionDataMode() === "live";
}
