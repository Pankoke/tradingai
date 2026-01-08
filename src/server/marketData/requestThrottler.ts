import { setTimeout as sleep } from "node:timers/promises";

type ThrottlerConfig = {
  provider: string;
  maxPerMinute: number;
  maxPerRun: number;
  backoffBaseMs: number;
  backoffFactor: number;
  maxBackoffMs: number;
  jitterMs: number;
};

type ThrottlerStats = {
  provider: string;
  totalRequests: number;
  throttledCount: number;
  backoffCount: number;
  rateLimit429Count: number;
};

type FetchOptions = RequestInit & { maxRetries?: number };

const DEFAULT_CONFIG: Omit<ThrottlerConfig, "provider"> = {
  maxPerMinute: 90,
  maxPerRun: 200,
  backoffBaseMs: 500,
  backoffFactor: 2,
  maxBackoffMs: 8_000,
  jitterMs: 200,
};

class ProviderThrottler {
  private windowStart = Date.now();
  private windowRequests = 0;
  private stats: ThrottlerStats;

  constructor(private readonly config: ThrottlerConfig) {
    this.stats = {
      provider: config.provider,
      totalRequests: 0,
      throttledCount: 0,
      backoffCount: 0,
      rateLimit429Count: 0,
    };
  }

  private resetWindowIfNeeded() {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.windowRequests = 0;
    }
  }

  private async throttleIfNeeded(): Promise<void> {
    this.resetWindowIfNeeded();
    if (this.windowRequests < this.config.maxPerMinute) {
      return;
    }
    this.stats.throttledCount += 1;
    const waitMs = 500 + Math.random() * this.config.jitterMs;
    await sleep(waitMs);
    await this.throttleIfNeeded();
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(
      this.config.maxBackoffMs,
      this.config.backoffBaseMs * this.config.backoffFactor ** attempt,
    );
    const jitter = Math.random() * this.config.jitterMs;
    this.stats.backoffCount += 1;
    await sleep(delay + jitter);
  }

  async fetch(url: string, init: FetchOptions = {}): Promise<Response> {
    if (this.stats.totalRequests >= this.config.maxPerRun) {
      this.stats.throttledCount += 1;
      throw new Error(`[${this.config.provider}] maxPerRun exceeded`);
    }

    const maxRetries = init.maxRetries ?? 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      await this.throttleIfNeeded();
      this.resetWindowIfNeeded();
      this.windowRequests += 1;
      this.stats.totalRequests += 1;

      const response = await fetch(url, init);
      if (response.status === 429) {
        this.stats.rateLimit429Count += 1;
        if (attempt === maxRetries) {
          return response;
        }
        await this.backoff(attempt);
        attempt += 1;
        continue;
      }
      return response;
    }

    throw new Error(`[${this.config.provider}] fetch attempts exhausted`);
  }

  consumeStats(): ThrottlerStats {
    const current = { ...this.stats };
    this.stats.totalRequests = 0;
    this.stats.throttledCount = 0;
    this.stats.backoffCount = 0;
    this.stats.rateLimit429Count = 0;
    return current;
  }
}

const throttlers = new Map<string, ProviderThrottler>();

function resolveConfig(provider: string): ThrottlerConfig {
  const envPrefix = provider.toUpperCase();
  const maxPerMinute = Number.parseInt(process.env[`MARKETDATA_${envPrefix}_MAX_RPM`] ?? "", 10)
    || DEFAULT_CONFIG.maxPerMinute;
  const maxPerRun = Number.parseInt(process.env.MARKETDATA_INTRADAY_MAX_REQUESTS_PER_RUN ?? "", 10)
    || DEFAULT_CONFIG.maxPerRun;
  return {
    provider,
    maxPerMinute,
    maxPerRun,
    backoffBaseMs: DEFAULT_CONFIG.backoffBaseMs,
    backoffFactor: DEFAULT_CONFIG.backoffFactor,
    maxBackoffMs: DEFAULT_CONFIG.maxBackoffMs,
    jitterMs: DEFAULT_CONFIG.jitterMs,
  };
}

export function getThrottler(provider: string): ProviderThrottler {
  if (!throttlers.has(provider)) {
    throttlers.set(provider, new ProviderThrottler(resolveConfig(provider)));
  }
  return throttlers.get(provider)!;
}

export function consumeThrottlerStats(): ThrottlerStats[] {
  return Array.from(throttlers.values()).map((t) => t.consumeStats());
}
