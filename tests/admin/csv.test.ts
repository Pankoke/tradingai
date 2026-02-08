import { describe, expect, it } from "vitest";
import { toCsv } from "@/src/lib/admin/csv/toCsv";

describe("admin csv helper", () => {
  it("escapes commas, quotes, and newlines", () => {
    const csv = toCsv(
      ["id", "text", "note"],
      [["a1", 'value,with"quotes"', "line1\nline2"]],
    );

    expect(csv).toBe('id,text,note\na1,"value,with""quotes""","line1\nline2"');
  });

  it("renders null and undefined as empty cells", () => {
    const csv = toCsv(["a", "b", "c"], [[null, undefined, "ok"]]);
    expect(csv).toBe("a,b,c\n,,ok");
  });

  it("keeps stable header order", () => {
    const csv = toCsv(["first", "second", "third"], [["1", "2", "3"]]);
    expect(csv.split("\n")[0]).toBe("first,second,third");
  });
});
