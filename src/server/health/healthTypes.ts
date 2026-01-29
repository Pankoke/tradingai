export type HealthStatus = "ok" | "degraded" | "error";

export type HealthError = { code: string; message: string };

export type HealthCheckResult = {
  key: string;
  status: HealthStatus;
  asOf: string; // ISO 8601
  durationMs: number;
  freshness?: {
    latestTimestamp?: string;
    ageSeconds?: number;
    window?: string;
  };
  counts?: Record<string, number | null>;
  warnings: string[];
  errors: HealthError[];
  meta?: Record<string, string | number | boolean | null>;
};
