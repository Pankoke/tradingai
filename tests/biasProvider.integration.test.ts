import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/src/server/db/db";
import { biasSnapshots } from "@/src/server/db/schema/biasSnapshots";
import { eq } from "drizzle-orm";
import { DbBiasProvider } from "@/src/server/providers/biasProvider";
import { scoreFromBias } from "@/src/lib/engine/modules/biasScoring";

const TEST_ID = "vitest-bias-eth-2025";
const ASSET_ID = "eth";
const TIMEFRAME = "1D";
const TARGET_DATE = new Date("2025-12-02T12:00:00Z");

async function insertTestRow() {
  await db.delete(biasSnapshots).where(eq(biasSnapshots.id, TEST_ID));
  await db.insert(biasSnapshots).values({
    id: TEST_ID,
    assetId: ASSET_ID,
    date: TARGET_DATE.toISOString().slice(0, 10),
    timeframe: TIMEFRAME,
    biasScore: -100,
    confidence: 70,
    trendScore: 40,
  });
}

async function cleanupTestRow() {
  await db.delete(biasSnapshots).where(eq(biasSnapshots.id, TEST_ID));
}

describe("DbBiasProvider integration", () => {
  beforeEach(async () => {
    await insertTestRow();
  });

  afterEach(async () => {
    await cleanupTestRow();
  });

  it("returns the persisted bias snapshot for the requested date", async () => {
    const provider = new DbBiasProvider();
    const result = await provider.getBiasSnapshot({
      assetId: ASSET_ID,
      timeframe: TIMEFRAME,
      date: TARGET_DATE,
    });

    expect(result).not.toBeNull();
    expect(result?.biasScore).toBe(-100);
    expect(result?.confidence).toBe(70);
  });

  it("computes a bias score far from neutral once the row exists", async () => {
    const provider = new DbBiasProvider();
    const result = await provider.getBiasSnapshot({
      assetId: ASSET_ID,
      timeframe: TIMEFRAME,
      date: TARGET_DATE,
    });

    expect(result).not.toBeNull();
    const direction = result!.biasScore >= 0 ? "Bullish" : "Bearish";
    const computed = scoreFromBias("Long", direction, result!.confidence);

    expect(computed).toBeLessThan(40);
  });
});
