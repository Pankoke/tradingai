export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

function normalizeHeader(header: string): string {
  return header.trim();
}

function parseLineCells(input: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "\"") {
      if (inQuotes && input[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

export function parseCsv(input: string): ParsedCsv {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "\"") {
      if (inQuotes && input[i + 1] === "\"") {
        field += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && input[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  if (!rows.length) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => normalizeHeader(header));
  const normalizedRows = dataRows.map((dataRow) => {
    if (dataRow.length >= headers.length) return dataRow.slice(0, headers.length);
    return [...dataRow, ...new Array(headers.length - dataRow.length).fill("")];
  });

  return { headers, rows: normalizedRows };
}

export function parseCsvToObjects(input: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = parseCsv(input);
  const rows = parsed.rows.map((row) => {
    const record: Record<string, string> = {};
    parsed.headers.forEach((header, index) => {
      if (!header) return;
      record[header] = row[index] ?? "";
    });
    return record;
  });
  return { headers: parsed.headers, rows };
}

export function parseCsvHeaderLine(input: string): string[] {
  return parseLineCells(input).map((header) => normalizeHeader(header));
}
