import { parse } from "dotenv";
import fs from "node:fs";
import path from "node:path";

// Load DATABASE_URL from .env.local if not already set; keep setup lean to avoid interfering with Vitest runtime.
const envPath = path.resolve(process.cwd(), ".env.local");
if (!process.env.DATABASE_URL && fs.existsSync(envPath)) {
  const parsed = parse(fs.readFileSync(envPath));
  if (parsed.DATABASE_URL) {
    process.env.DATABASE_URL = parsed.DATABASE_URL;
  }
}
