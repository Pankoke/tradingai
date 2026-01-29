import { describe, expect, it } from "vitest";
import { getContainer } from "@/src/server/container";

describe("composition root container", () => {
  it("returns a stable container instance with expected ports", () => {
    const first = getContainer();
    const second = getContainer();

    expect(first).toBe(second);
    expect(first.candleRepo).toBeDefined();
    expect(first.eventRepo).toBeDefined();
    expect(first.marketData).toBeDefined();
    expect(first.sentiment).toBeDefined();
    expect(first.snapshotStore).toBeDefined();
  });
});
