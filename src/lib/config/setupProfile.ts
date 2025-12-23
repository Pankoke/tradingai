export type SetupProfile = "SCALP" | "INTRADAY" | "SWING" | "POSITION";

type EventWindowConfig = {
  execMinutes: number;
  contextMinutes: number;
  postMinutes?: number;
};

type SetupProfileConfig = {
  profile: SetupProfile;
  primaryTimeframe: string;
  confirmTimeframe?: string;
  eventWindows: EventWindowConfig;
  ringDefaults?: Record<string, unknown>;
  levelsDefaults?: Record<string, unknown>;
};

const PROFILE_CONFIG: Record<SetupProfile, SetupProfileConfig> = {
  SCALP: {
    profile: "SCALP",
    primaryTimeframe: "5m",
    confirmTimeframe: "15m",
    eventWindows: { execMinutes: 45, contextMinutes: 360, postMinutes: 60 },
  },
  INTRADAY: {
    profile: "INTRADAY",
    primaryTimeframe: "1h",
    confirmTimeframe: "4h",
    eventWindows: { execMinutes: 90, contextMinutes: 720, postMinutes: 120 },
  },
  SWING: {
    profile: "SWING",
    primaryTimeframe: "1D",
    confirmTimeframe: undefined,
    eventWindows: { execMinutes: 120, contextMinutes: 2880, postMinutes: 180 },
  },
  POSITION: {
    profile: "POSITION",
    primaryTimeframe: "1W",
    confirmTimeframe: undefined,
    eventWindows: { execMinutes: 240, contextMinutes: 4320, postMinutes: 360 },
  },
};

export function deriveSetupProfileFromTimeframe(timeframe: string | undefined | null): SetupProfile {
  if (!timeframe) return "SWING";
  const tf = timeframe.toLowerCase();
  if (tf.includes("5m")) return "SCALP";
  if (tf.includes("15m")) return "SCALP";
  if (tf.includes("1h")) return "INTRADAY";
  if (tf.includes("4h")) return "INTRADAY";
  if (tf.includes("1w") || tf.includes("week")) return "POSITION";
  if (tf.includes("1d") || tf.includes("daily") || tf.includes("day")) return "SWING";
  return "SWING";
}

export function getSetupProfileConfig(profile: SetupProfile): SetupProfileConfig {
  return PROFILE_CONFIG[profile] ?? PROFILE_CONFIG.SWING;
}
