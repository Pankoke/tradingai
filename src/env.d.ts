// Clerk-Keys, bitte in .env.local setzen
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    TWELVEDATA_API_KEY?: string;
    FINNHUB_API_KEY?: string;
    MARKET_PROVIDER_MODE?: string;
    INTRADAY_ASSET_WHITELIST?: string;
    MARKETDATA_TWELVEDATA_MAX_RPM?: string;
    MARKETDATA_FINNHUB_MAX_RPM?: string;
    MARKETDATA_INTRADAY_MAX_REQUESTS_PER_RUN?: string;
    JB_NEWS_API_KEY?: string;
    EVENTS_INGEST_MIN_IMPACT?: string;
    EVENTS_RETENTION_DAYS?: string;
    EVENTS_AI_ENRICH_ENABLED?: string;
    EVENTS_AI_ENRICH_MODEL?: string;
    EVENTS_AI_TIMEOUT_MS?: string;
    EVENTS_AI_MAX_RETRIES?: string;
    EVENTS_AI_ALLOW_EXPECTATION?: string;
    OPENAI_API_KEY?: string;
    RING_AI_SUMMARY_MODEL?: string;
    RING_AI_SUMMARY_LLM_ENABLED?: string;
  }
}
