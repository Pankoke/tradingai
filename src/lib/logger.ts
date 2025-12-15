type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
const configuredLevel = (process.env.LOG_LEVEL as LogLevel | undefined)?.toLowerCase() as LogLevel | undefined;
const activeLevel = LOG_LEVEL_WEIGHTS[configuredLevel ?? DEFAULT_LEVEL] ? configuredLevel ?? DEFAULT_LEVEL : DEFAULT_LEVEL;

function normalizeMeta(meta?: LogMeta): LogMeta | undefined {
  if (!meta) return undefined;
  const sanitized: LogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value instanceof Error) {
      sanitized[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack?.split("\n").slice(0, 5).join(" | "),
      };
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

function emitLog(level: LogLevel, message: string, meta?: LogMeta) {
  if (LOG_LEVEL_WEIGHTS[level] < LOG_LEVEL_WEIGHTS[activeLevel]) {
    return;
  }
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    meta: normalizeMeta(meta),
  };

  const target =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "debug"
          ? console.debug
          : console.log;

  target(JSON.stringify(payload));
}

class Logger {
  constructor(private readonly context?: LogMeta) {}

  debug(message: string, meta?: LogMeta): void {
    emitLog("debug", message, { ...this.context, ...meta });
  }

  info(message: string, meta?: LogMeta): void {
    emitLog("info", message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: LogMeta): void {
    emitLog("warn", message, { ...this.context, ...meta });
  }

  error(message: string, meta?: LogMeta): void {
    emitLog("error", message, { ...this.context, ...meta });
  }

  child(extra: LogMeta): Logger {
    return new Logger({ ...this.context, ...extra });
  }
}

export const logger = new Logger();
export type { LogMeta, LogLevel };
