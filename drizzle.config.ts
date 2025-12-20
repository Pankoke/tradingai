import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL ist nicht gesetzt. Lege sie in einer .env.local oder .env im Projektroot (G:\\tradingai) an.',
  );
}

export default {
  schema: "./src/server/db/schema",
  out: "drizzle",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
} as unknown as Config;
