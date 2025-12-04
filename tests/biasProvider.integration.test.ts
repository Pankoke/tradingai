import { beforeEach, afterEach, describe, it, expect } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("DbBiasProvider integration", () => {
  let db: Awaited<ReturnType<typeof import("@/src/server/db/db")>>["db"];
  let biasSnapshots: Awaited<
    ReturnType<typeof import("@/src/server/db/schema/biasSnapshots")>
  >["biasSnapshots"];
  let eq: typeof (await import("drizzle-orm")).eq;
  let DbBiasProvider: typeof (await import("@/src/server/providers/biasProvider")).DbBiasProvider;
  let scoreFromBias: typeof (await import("@/src/lib/engine/modules/biasScoring")).scoreFromBias;

  const TEST_ID = "vitest-bias-eth-2025";
  const ASSET_ID = "eth";
  const TIMEFRAME = "1D";
  const TARGET_DATE = new Date("2025-12-02T12:00:00Z");

  beforeEach(async () => {
    const dbModule = await import("@/src/server/db/db");
    const biasModule = await import("@/src/server/db/schema/biasSnapshots");
    const orm = await import("drizzle-orm");
    const providerModule = await import("@/src/server/providers/biasProvider");
    const scoringModule = await import("@/src/lib/engine/modules/biasScoring");

    db = dbModule.db;
    biasSnapshots = biasModule.biasSnapshots;
    eq = orm.eq;
    DbBiasProvider = providerModule.DbBiasProvider;
    scoreFromBias = scoringModule.scoreFromBias;

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
  });

  afterEach(async () => {
    await db.delete(biasSnapshots).where(eq(biasSnapshots.id, TEST_ID));
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
