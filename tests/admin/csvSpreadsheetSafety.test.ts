import { describe, expect, it } from "vitest";
import {
  isSpreadsheetFormulaLike,
  sanitizeForSpreadsheet,
  toCsv,
} from "@/src/lib/admin/csv/toCsv";

describe("csv spreadsheet safety", () => {
  it("detects dangerous spreadsheet prefixes including leading whitespace", () => {
    expect(isSpreadsheetFormulaLike("=1+1")).toBe(true);
    expect(isSpreadsheetFormulaLike("  =SUM(A1:A2)")).toBe(true);
    expect(isSpreadsheetFormulaLike("+cmd|' /C calc'!A0")).toBe(true);
    expect(isSpreadsheetFormulaLike("-1+2")).toBe(true);
    expect(isSpreadsheetFormulaLike("@HYPERLINK(\"https://example.com\")")).toBe(true);
    expect(isSpreadsheetFormulaLike("normal text")).toBe(false);
    expect(isSpreadsheetFormulaLike("'=already-safe")).toBe(false);
  });

  it("prefixes dangerous string values with single quote", () => {
    expect(sanitizeForSpreadsheet("=1+1")).toBe("'=1+1");
    expect(sanitizeForSpreadsheet("  =SUM(A1:A2)")).toBe("'  =SUM(A1:A2)");
    expect(sanitizeForSpreadsheet("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeForSpreadsheet("-1+2")).toBe("'-1+2");
    expect(sanitizeForSpreadsheet("@HYPERLINK(\"https://example.com\")")).toBe("'@HYPERLINK(\"https://example.com\")");
    expect(sanitizeForSpreadsheet("normal text")).toBe("normal text");
  });

  it("keeps numeric fields unchanged while sanitizing string fields", () => {
    const csv = toCsv(["asString", "asNumber"], [["-1", -1]]);
    expect(csv).toBe("asString,asNumber\n'-1,-1");
  });

  it("keeps RFC escaping correct after sanitization", () => {
    const csv = toCsv(["expr"], [["=@\"a,b\"\n"]]);
    expect(csv).toBe('expr\n"\'=@""a,b""\n"');
  });
});
