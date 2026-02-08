import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/db";
import { assets } from "../db/schema/assets";
import type { AssetsExportFilters } from "@/src/lib/admin/exports/parseExportFilters";

export type Asset = typeof assets["$inferSelect"];
export type AssetInput = typeof assets["$inferInsert"];

export async function getAllAssets(): Promise<Asset[]> {
  return db.select().from(assets).orderBy(assets.symbol);
}

export async function getAssetsFiltered(filters: AssetsExportFilters): Promise<Asset[]> {
  const conditions = [];

  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(assets.id, pattern),
        ilike(assets.symbol, pattern),
        ilike(assets.displaySymbol, pattern),
        ilike(assets.name, pattern),
      ),
    );
  }

  if (filters.status === "active") {
    conditions.push(eq(assets.isActive, true));
  } else if (filters.status === "inactive") {
    conditions.push(eq(assets.isActive, false));
  }

  if (filters.class) {
    conditions.push(eq(assets.assetClass, filters.class));
  }

  const query = db.select().from(assets);
  const filteredQuery = conditions.length ? query.where(and(...conditions)) : query;
  const orderedQuery =
    filters.sort === "createdAt"
      ? filteredQuery.orderBy(desc(assets.createdAt), assets.symbol)
      : filteredQuery.orderBy(assets.symbol);

  if (filters.limit) {
    return orderedQuery.limit(filters.limit);
  }
  return orderedQuery;
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

export async function getAssetsByAssetIds(ids: string[]): Promise<Asset[]> {
  if (!ids.length) return [];
  return db.select().from(assets).where(inArray(assets.id, ids));
}

export async function getAssetsBySymbols(symbols: string[]): Promise<Asset[]> {
  if (!symbols.length) return [];
  return db.select().from(assets).where(inArray(assets.symbol, symbols));
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
