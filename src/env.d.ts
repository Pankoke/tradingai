// Clerk-Keys, bitte in .env.local setzen
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    TWELVEDATA_API_KEY?: string;
    MARKET_PROVIDER_MODE?: string;
  }
}
