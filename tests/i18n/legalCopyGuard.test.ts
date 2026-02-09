import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

type LocaleCode = "de" | "en";

type ForbiddenRule = {
  id: string;
  regex: RegExp;
};

const MESSAGES_DIR = path.resolve(process.cwd(), "src/messages");
const TARGET_PREFIXES = ["setup."];

const FORBIDDEN_RULES: Record<LocaleCode, ForbiddenRule[]> = {
  de: [
    { id: "kaufen", regex: /\bkaufen\b/i },
    { id: "verkaufen", regex: /\bverkaufen\b/i },
    { id: "handeln", regex: /\bhandeln\b/i },
    { id: "trade", regex: /\btrade\b(?!-)/i },
    { id: "empfohlen", regex: /\bempfohlen\b/i },
    { id: "empfehlung", regex: /\bempfehlung\b/i },
    { id: "muss", regex: /\bmuss\b/i },
    { id: "garantiert", regex: /\bgarantiert\b/i },
    { id: "sicherer gewinn", regex: /\bsicherer\s+gewinn\b/i },
  ],
  en: [
    { id: "buy", regex: /\bbuy\b/i },
    { id: "sell", regex: /\bsell\b/i },
    { id: "trade now", regex: /\btrade\s+now\b/i },
    { id: "recommended", regex: /\brecommended\b/i },
    { id: "must", regex: /\bmust\b/i },
    { id: "guaranteed", regex: /\bguaranteed\b/i },
    { id: "sure profit", regex: /\bsure\s+profit\b/i },
  ],
};

describe("i18n legal-copy guard (setup ux)", () => {
  test("de/en setup namespace has no forbidden advisory terms", () => {
    const findings = (["de", "en"] as const).flatMap((locale) => {
      const messages = readMessages(locale);
      const scopedEntries = Object.entries(messages).filter(([key]) =>
        TARGET_PREFIXES.some((prefix) => key.startsWith(prefix)),
      );
      return findViolations(locale, scopedEntries);
    });

    expect(findings).toEqual([]);
  });
});

function readMessages(locale: LocaleCode): Record<string, string> {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!isStringRecord(parsed)) {
    throw new Error(`Expected flat string dictionary in ${filePath}`);
  }

  return parsed;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "string");
}

function findViolations(
  locale: LocaleCode,
  entries: Array<[string, string]>,
): string[] {
  const rules = FORBIDDEN_RULES[locale];
  const findings: string[] = [];

  for (const [key, text] of entries) {
    for (const rule of rules) {
      if (rule.regex.test(text)) {
        findings.push(`[${locale}] ${key} -> "${text}" matched: ${rule.id}`);
      }
    }
  }

  return findings;
}
