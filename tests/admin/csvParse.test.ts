import { describe, expect, it } from "vitest";
import { parseCsvToObjects } from "@/src/lib/admin/csv/parseCsv";

describe("parseCsvToObjects", () => {
  it("parses quoted commas, quotes and newlines", () => {
    const csv = 'id,title\n1,"CPI, ""US""\nrelease"\n';
    const parsed = parseCsvToObjects(csv);
    expect(parsed.headers).toEqual(["id", "title"]);
    expect(parsed.rows[0]?.id).toBe("1");
    expect(parsed.rows[0]?.title).toBe('CPI, "US"\nrelease');
  });

  it("ignores empty lines and keeps header mapping", () => {
    const csv = "symbol,name\n\nBTC,Bitcoin\n\nETH,Ether\n";
    const parsed = parseCsvToObjects(csv);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[1]).toEqual({ symbol: "ETH", name: "Ether" });
  });
});
