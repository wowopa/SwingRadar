import { describe, expect, it } from "vitest";

import {
  buildOpeningRecheckCounts,
  getOpeningRecheckStatusMeta,
  suggestOpeningRecheckStatus
} from "@/lib/recommendations/opening-recheck";

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

    expect(meta.label.length).toBeGreaterThan(0);
    expect(meta.description.length).toBeGreaterThan(0);
  });

  it("suggests a conservative status from the checklist", () => {
    expect(
      suggestOpeningRecheckStatus({
        gap: "normal",
        confirmation: "confirmed",
        action: "review"
      })
    ).toBe("passed");

    expect(
      suggestOpeningRecheckStatus({
        gap: "elevated",
        confirmation: "confirmed",
        action: "review"
      })
    ).toBe("watch");

    expect(
      suggestOpeningRecheckStatus({
        gap: "overheated",
        confirmation: "confirmed",
        action: "review"
      })
    ).toBe("avoid");

    expect(
      suggestOpeningRecheckStatus({
        gap: "normal",
        confirmation: "failed",
        action: "review"
      })
    ).toBe("excluded");
  });
});
