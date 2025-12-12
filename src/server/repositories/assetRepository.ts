import { randomUUID } from "node:crypto";
import { sql, eq } from "drizzle-orm";
import { db } from "../db/db";
import { assets } from "../db/schema/assets";

export type Asset = typeof assets["$inferSelect"];
export type AssetInput = typeof assets["$inferInsert"];

export async function getAllAssets(): Promise<Asset[]> {
  return db.select().from(assets).orderBy(assets.symbol);
}

export async function getActiveAssets(): Promise<Asset[]> {
  return db
    .select()
    .from(assets)
    .where(eq(assets.isActive, true))
    .orderBy(assets.symbol);
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, id))
    .limit(1);
  return asset;
}

export async function getAssetBySymbol(symbol: string): Promise<Asset | undefined> {
  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.symbol, symbol))
    .limit(1);
  return asset;
}

export async function countAssets(): Promise<number> {
  const [result] = await db.select({ value: sql<number>`count(*)` }).from(assets);
  return result?.value ?? 0;
}

export async function createAsset(input: Omit<AssetInput, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Asset> {
  const id = input.id ?? randomUUID();
  const [created] = await db
    .insert(assets)
    .values({
      ...input,
      id,
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updateAsset(id: string, updates: Partial<Omit<AssetInput, "id">>): Promise<Asset | undefined> {
  const [updated] = await db
    .update(assets)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(assets.id, id))
    .returning();
  return updated;
}

export async function deleteAsset(id: string): Promise<void> {
  await db.delete(assets).where(eq(assets.id, id));
}
