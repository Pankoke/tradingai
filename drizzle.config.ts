// drizzle.config.ts
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// .env.local laden (oder .env – je nachdem, was du nutzt)
dotenv.config({ path: ".env.local" });
// Falls du stattdessen nur eine .env verwendest, nimm diese Zeile:
// dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL ist nicht gesetzt. Lege sie in einer .env.local oder .env im Projektroot (G:\\tradingai) an.'
  );
}

const config = {
  dialect: "postgresql",
  schema: "./src/server/db/schema", // Ordner reicht, * ist nicht nötig
  out: "drizzle",                  // entspricht deinem bisherigen migrationsFolder
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;

export default config;
