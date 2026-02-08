export type ImportRowStatus = "create" | "update" | "skip" | "error";

export type ImportChange = {
  from: string | number | boolean | null;
  to: string | number | boolean | null;
};

export type ImportRowPreview = {
  rowIndex: number;
  key: string;
  status: ImportRowStatus;
  message?: string;
  changes?: Record<string, ImportChange>;
};

export type ImportSummary = {
  rowsTotal: number;
  creates: number;
  updates: number;
  skips: number;
  errors: number;
  ignoredColumns: string[];
};

export type ImportPreviewResult = {
  summary: ImportSummary;
  rowsPreview: ImportRowPreview[];
  previewHash: string;
};

export type ImportApplyResult = {
  summary: ImportSummary;
};
