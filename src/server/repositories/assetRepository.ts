import { db } from "../db/db";
import { assets } from "../db/schema/assets";
import { eq } from "drizzle-orm";

type Asset = typeof assets["$inferSelect"];

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
