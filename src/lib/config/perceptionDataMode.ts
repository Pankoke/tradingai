export type PerceptionDataMode = "live" | "mock";

export function getPerceptionDataMode(): PerceptionDataMode {
  const mode = (process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE ?? "").toLowerCase();
  return mode === "mock" ? "mock" : "live";
}

export function isPerceptionMockMode(): boolean {
  return getPerceptionDataMode() === "mock";
}

export function isPerceptionLiveMode(): boolean {
  return getPerceptionDataMode() === "live";
}
