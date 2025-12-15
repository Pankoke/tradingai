import { afterEach, vi } from "vitest";
import { parse } from "dotenv";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (!process.env.DATABASE_URL && fs.existsSync(envPath)) {
  const parsed = parse(fs.readFileSync(envPath));
  if (parsed.DATABASE_URL) {
    process.env.DATABASE_URL = parsed.DATABASE_URL;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
