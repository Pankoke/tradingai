export type SetupProfile = "INTRADAY" | "SWING" | "POSITION";

type EventWindowConfig = {
  execMinutes: number;
  contextMinutes: number;
  postMinutes?: number;
};

type LevelDefaults = {
  bandScale?: number;
};

type SetupProfileConfig = {
  profile: SetupProfile;
  primaryTimeframe: string;
  confirmTimeframe?: string;
  eventWindows: EventWindowConfig;
  ringDefaults?: Record<string, unknown>;
  levelsDefaults?: LevelDefaults;
};

const PROFILE_CONFIG: Record<SetupProfile, SetupProfileConfig> = {
  INTRADAY: {
    profile: "INTRADAY",
    primaryTimeframe: "1H",
    confirmTimeframe: "4H",
    eventWindows: { execMinutes: 90, contextMinutes: 720, postMinutes: 120 },
    levelsDefaults: { bandScale: 0.65 },
  },
  SWING: {
    profile: "SWING",
    primaryTimeframe: "1D",
    confirmTimeframe: undefined,
    eventWindows: { execMinutes: 120, contextMinutes: 1440, postMinutes: 180 },
  },
  POSITION: {
    profile: "POSITION",
    primaryTimeframe: "1W",
    confirmTimeframe: undefined,
    eventWindows: { execMinutes: 240, contextMinutes: 4320, postMinutes: 360 },
    levelsDefaults: { bandScale: 1.2 },
  },
};

export function deriveSetupProfileFromTimeframe(timeframe: string | undefined | null): SetupProfile {
  if (!timeframe) return "SWING";
  const tf = timeframe.toLowerCase();
  if (tf.includes("5m")) return "INTRADAY";
  if (tf.includes("15m")) return "INTRADAY";
  if (tf.includes("1h")) return "INTRADAY";
  if (tf.includes("4h")) return "INTRADAY";
  if (tf.includes("1w") || tf.includes("week")) return "POSITION";
  if (tf.includes("1d") || tf.includes("daily") || tf.includes("day")) return "SWING";
  return "SWING";
}

export function getSetupProfileConfig(profile: SetupProfile): SetupProfileConfig {
  return PROFILE_CONFIG[profile] ?? PROFILE_CONFIG.SWING;
}
