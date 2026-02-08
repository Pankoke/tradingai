export type CsvPrimitive = string | number | boolean | null | undefined | Date;
type ToCsvOptions = {
  spreadsheetSafe?: boolean;
};

function needsQuoting(value: string): boolean {
  return /[",\n\r]/.test(value);
}

export function isSpreadsheetFormulaLike(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("'")) return false;
  return /^[\s]*[=+\-@]/.test(value);
}

// Prefix formula-like strings to prevent spreadsheet formula execution on import.
export function sanitizeForSpreadsheet(value: string): string {
  if (!isSpreadsheetFormulaLike(value)) return value;
  return `'${value}`;
}

function toCellValue(value: CsvPrimitive): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function escapeCsvCell(value: CsvPrimitive, options: ToCsvOptions = {}): string {
  const spreadsheetSafe = options.spreadsheetSafe ?? true;
  const rawText = toCellValue(value);
  const text = spreadsheetSafe && typeof value === "string" ? sanitizeForSpreadsheet(rawText) : rawText;
  if (!needsQuoting(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function toCsv(headers: string[], rows: CsvPrimitive[][], options: ToCsvOptions = {}): string {
  const headerLine = headers.map((header) => escapeCsvCell(header, options)).join(",");
  const lines = rows.map((row) => row.map((cell) => escapeCsvCell(cell, options)).join(","));
  return [headerLine, ...lines].join("\n");
}
