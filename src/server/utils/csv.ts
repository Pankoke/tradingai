function needsQuoting(value: string): boolean {
  return /[",\n]/.test(value);
}

export function escapeCsvCell(value: string): string {
  if (!needsQuoting(value)) return value;
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map((h) => escapeCsvCell(h)).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
  ];
  return lines.join("\n");
}
