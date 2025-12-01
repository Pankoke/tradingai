const RANGE_REGEX = /-?\d+(\.\d+)?/g;

export function formatRangeText(value?: string | null): string {
  if (!value) {
    return "n/a";
  }
  const matches = value.match(RANGE_REGEX);
  if (!matches || matches.length === 0) {
    return "n/a";
  }
  if (matches.length === 1) {
    const num = Number(matches[0]);
    return Number.isFinite(num) ? num.toFixed(4) : "n/a";
  }
  const numbers = matches.map((match) => Number(match));
  const [a, b] = numbers;
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return `${a.toFixed(4)} - ${b.toFixed(4)}`;
  }
  return "n/a";
}

export function formatNumberText(value?: string | null): string {
  if (value === undefined || value === null) {
    return "n/a";
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "n/a";
  }
  return num.toFixed(4);
}
