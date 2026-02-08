import { buildImportPreviewHash } from "@/src/lib/admin/import/previewHash";
import type { ImportApplyResult, ImportPreviewResult, ImportRowPreview, ImportSummary } from "@/src/lib/admin/import/types";
import { parseCsvToObjects } from "@/src/lib/admin/csv/parseCsv";
import {
  createAsset,
  getAssetsByAssetIds,
  getAssetsBySymbols,
  updateAsset,
  type Asset,
} from "@/src/server/repositories/assetRepository";

const ASSET_ALLOWED_COLUMNS = new Set([
  "assetId",
  "id",
  "symbol",
  "displaySymbol",
  "name",
  "class",
  "assetClass",
  "status",
  "isActive",
  "baseCurrency",
  "quoteCurrency",
]);

type AssetOperation =
  | { status: "error"; rowIndex: number; key: string; message: string }
  | { status: "skip"; rowIndex: number; key: string; message?: string }
  | {
      status: "create";
      rowIndex: number;
      key: string;
      createInput: {
        id?: string;
        symbol: string;
        displaySymbol: string;
        name: string;
        assetClass: string;
        baseCurrency: string | null;
        quoteCurrency: string | null;
        isActive: boolean;
      };
      changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>;
    }
  | {
      status: "update";
      rowIndex: number;
      key: string;
      assetId: string;
      updateInput: AssetUpdateInput;
      changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>;
    };

type AssetUpdateInput = Partial<{
        symbol: string;
        displaySymbol: string;
        name: string;
        assetClass: string;
        baseCurrency: string | null;
        quoteCurrency: string | null;
        isActive: boolean;
      }>;

type PreparedAssetsImport = {
  summary: ImportSummary;
  rowsPreview: ImportRowPreview[];
  operations: AssetOperation[];
  previewHash: string;
};

function parseBool(raw: string | undefined): boolean | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "true" || value === "1" || value === "active" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "inactive" || value === "no") return false;
  return null;
}

function clean(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toPreviewRow(operation: AssetOperation): ImportRowPreview {
  if (operation.status === "create" || operation.status === "update") {
    return {
      rowIndex: operation.rowIndex,
      key: operation.key,
      status: operation.status,
      changes: operation.changes,
    };
  }
  return {
    rowIndex: operation.rowIndex,
    key: operation.key,
    status: operation.status,
    message: operation.message,
  };
}

function diffAsset(existing: Asset | null, patch: Record<string, unknown>): Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }> {
  const changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }> = {};
  for (const [field, nextValue] of Object.entries(patch)) {
    const currentValue = existing ? (existing as unknown as Record<string, unknown>)[field] : null;
    if (currentValue === nextValue) continue;
    changes[field] = {
      from:
        typeof currentValue === "string" || typeof currentValue === "number" || typeof currentValue === "boolean" || currentValue === null
          ? currentValue
          : currentValue instanceof Date
            ? currentValue.toISOString()
            : String(currentValue ?? ""),
      to:
        typeof nextValue === "string" || typeof nextValue === "number" || typeof nextValue === "boolean" || nextValue === null
          ? nextValue
          : String(nextValue ?? ""),
    };
  }
  return changes;
}

async function prepareAssetsImport(csvText: string): Promise<PreparedAssetsImport> {
  const parsed = parseCsvToObjects(csvText);
  const ignoredColumns = parsed.headers.filter((header) => header && !ASSET_ALLOWED_COLUMNS.has(header));
  const previewHash = buildImportPreviewHash({ entityType: "assets", csvText, mode: "preview" });

  const idKeys = new Set<string>();
  const symbolKeys = new Set<string>();
  for (const row of parsed.rows) {
    const id = clean(row.assetId ?? row.id);
    const symbol = clean(row.symbol);
    if (id) idKeys.add(id);
    if (symbol) symbolKeys.add(symbol);
  }

  const [byIds, bySymbols] = await Promise.all([
    getAssetsByAssetIds([...idKeys]),
    getAssetsBySymbols([...symbolKeys]),
  ]);

  const existingById = new Map(byIds.map((asset) => [asset.id, asset]));
  const existingBySymbol = new Map(bySymbols.map((asset) => [asset.symbol, asset]));
  const operations: AssetOperation[] = [];

  parsed.rows.forEach((row, idx) => {
    const rowIndex = idx + 2;
    const idKey = clean(row.assetId ?? row.id);
    const symbol = clean(row.symbol);
    const key = idKey ?? symbol ?? `row-${rowIndex}`;

    if (!idKey && !symbol) {
      operations.push({ status: "error", rowIndex, key, message: "Missing key: assetId/id or symbol is required" });
      return;
    }

    const existing = idKey ? existingById.get(idKey) ?? null : symbol ? existingBySymbol.get(symbol) ?? null : null;
    const isActiveRaw = clean(row.status) ?? clean(row.isActive);
    const isActiveParsed = parseBool(isActiveRaw);
    if (isActiveRaw && isActiveParsed === null) {
      operations.push({ status: "error", rowIndex, key, message: "Invalid status/isActive value" });
      return;
    }

    const patch: Record<string, unknown> = {};
    if (symbol) patch.symbol = symbol;
    if (clean(row.displaySymbol)) patch.displaySymbol = clean(row.displaySymbol);
    if (clean(row.name)) patch.name = clean(row.name);
    if (clean(row.assetClass ?? row.class)) patch.assetClass = clean(row.assetClass ?? row.class);
    if (row.baseCurrency !== undefined) patch.baseCurrency = clean(row.baseCurrency) ?? null;
    if (row.quoteCurrency !== undefined) patch.quoteCurrency = clean(row.quoteCurrency) ?? null;
    if (isActiveParsed !== null) patch.isActive = isActiveParsed;

    if (!existing) {
      const createSymbol = typeof patch.symbol === "string" ? patch.symbol : symbol;
      const createName = typeof patch.name === "string" ? patch.name : undefined;
      const createClass = typeof patch.assetClass === "string" ? patch.assetClass : undefined;
      if (!createSymbol || !createName || !createClass) {
        operations.push({
          status: "error",
          rowIndex,
          key,
          message: "Create requires symbol, name and assetClass/class",
        });
        return;
      }
      const createInput = {
        id: idKey,
        symbol: createSymbol,
        displaySymbol: typeof patch.displaySymbol === "string" ? patch.displaySymbol : createSymbol,
        name: createName,
        assetClass: createClass,
        baseCurrency: (patch.baseCurrency as string | null | undefined) ?? null,
        quoteCurrency: (patch.quoteCurrency as string | null | undefined) ?? null,
        isActive: typeof patch.isActive === "boolean" ? patch.isActive : true,
      };
      const changes = diffAsset(null, createInput);
      operations.push({ status: "create", rowIndex, key, createInput, changes });
      return;
    }

    const changes = diffAsset(existing, patch);
    if (!Object.keys(changes).length) {
      operations.push({ status: "skip", rowIndex, key, message: "No changes detected" });
      return;
    }
    operations.push({
      status: "update",
      rowIndex,
      key,
      assetId: existing.id,
      updateInput: patch as AssetUpdateInput,
      changes,
    });
  });

  const summary: ImportSummary = {
    rowsTotal: parsed.rows.length,
    creates: operations.filter((op) => op.status === "create").length,
    updates: operations.filter((op) => op.status === "update").length,
    skips: operations.filter((op) => op.status === "skip").length,
    errors: operations.filter((op) => op.status === "error").length,
    ignoredColumns,
  };

  return {
    summary,
    operations,
    rowsPreview: operations.slice(0, 50).map((operation) => toPreviewRow(operation)),
    previewHash,
  };
}

export async function previewAssetsImport(csvText: string): Promise<ImportPreviewResult> {
  const prepared = await prepareAssetsImport(csvText);
  return {
    summary: prepared.summary,
    rowsPreview: prepared.rowsPreview,
    previewHash: prepared.previewHash,
  };
}

export async function applyAssetsImport(params: {
  csvText: string;
  previewHash: string;
}): Promise<ImportApplyResult> {
  const prepared = await prepareAssetsImport(params.csvText);
  if (prepared.previewHash !== params.previewHash) {
    throw new Error("PREVIEW_MISMATCH");
  }
  if (prepared.summary.errors > 0) {
    throw new Error("PREVIEW_HAS_ERRORS");
  }

  for (const operation of prepared.operations) {
    if (operation.status === "create") {
      await createAsset(operation.createInput);
    } else if (operation.status === "update") {
      await updateAsset(operation.assetId, operation.updateInput);
    }
  }

  return { summary: prepared.summary };
}
