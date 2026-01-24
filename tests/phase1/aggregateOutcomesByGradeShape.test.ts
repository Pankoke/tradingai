import { describe, expect, it } from "vitest";

type OutcomeGradeAggregateRow = {
  setupGrade: string | null;
  total: number;
  open: number;
  hit_tp: number;
  hit_sl: number;
  expired: number;
  ambiguous: number;
  invalid: number;
};

function isOutcomeGradeAggregateRow(value: unknown): value is OutcomeGradeAggregateRow {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const numberKeys = ["total", "open", "hit_tp", "hit_sl", "expired", "ambiguous", "invalid"];
  return (
    ("setupGrade" in v || true) &&
    numberKeys.every((k) => typeof v[k] === "number") &&
    (typeof v.setupGrade === "string" || v.setupGrade === null || !(k in v))
  );
}

describe("aggregateOutcomesByGrade shape guard", () => {
  it("accepts valid aggregate row", () => {
    const row: OutcomeGradeAggregateRow = {
      setupGrade: "A",
      total: 10,
      open: 2,
      hit_tp: 4,
      hit_sl: 3,
      expired: 1,
      ambiguous: 0,
      invalid: 0,
    };
    expect(isOutcomeGradeAggregateRow(row)).toBe(true);
  });

  it("rejects missing numeric fields", () => {
    const bad = { setupGrade: "A", total: 1, open: 1 } as unknown;
    expect(isOutcomeGradeAggregateRow(bad)).toBe(false);
  });
});
