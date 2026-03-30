import { describe, expect, it } from "vitest";

import { buildOpeningRecheckCounts, getOpeningRecheckStatusMeta } from "@/lib/recommendations/opening-recheck";

describe("opening recheck utils", () => {
  it("counts pending tickers when no decision exists", () => {
    const counts = buildOpeningRecheckCounts(["AAA", "BBB", "CCC"], {
      AAA: { status: "passed", updatedAt: "2026-03-31T00:10:00.000Z" },
      CCC: { status: "avoid", updatedAt: "2026-03-31T00:12:00.000Z" }
    });

    expect(counts).toEqual({
      pending: 1,
      passed: 1,
      watch: 0,
      avoid: 1,
      excluded: 0
    });
  });

  it("returns readable metadata for each decision state", () => {
    const meta = getOpeningRecheckStatusMeta("excluded");

    expect(meta.label).toBe("제외");
    expect(meta.description).toContain("후보");
  });
});
