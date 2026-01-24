import { readFileSync } from "node:fs";

describe("Outcomes intro encoding", () => {
  it("does not contain mojibake markers", () => {
    const files = [
      "src/app/[locale]/admin/(panel)/outcomes/page.tsx",
      "src/app/[locale]/admin/(panel)/outcomes/overview/page.tsx",
      "src/app/[locale]/admin/(panel)/outcomes/diagnostics/page.tsx",
      "src/components/admin/OutcomesIntro.tsx",
    ];
    const badTokens = ["fÃ", "Ã¼", "ï¿½"];
    files.forEach((f) => {
      const content = readFileSync(f, "utf8");
      badTokens.forEach((tok) => {
        expect(content.includes(tok)).toBe(false);
      });
    });
  });
});
