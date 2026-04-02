import { describe, expect, it } from "vitest";

import {
  buildOpeningRecheckCounts,
  getOpeningRecheckStatusMeta,
  suggestOpeningRecheckStatus,
  suggestOpeningRecheckStatusWithContext
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

  it("demotes the suggested status when personal rules call for extra caution", () => {
    const suggestion = suggestOpeningRecheckStatusWithContext(
      {
        gap: "elevated",
        confirmation: "mixed",
        action: "review"
      },
      {
        personalRuleText: "확인 가격 실패면 당일 보류"
      }
    );

    expect(suggestion.baseStatus).toBe("watch");
    expect(suggestion.status).toBe("avoid");
    expect(suggestion.personalRuleReason).toContain("확인 가격");
  });

  it("demotes the suggested status when the same checklist pattern recently lost often", () => {
    const suggestion = suggestOpeningRecheckStatusWithContext(
      {
        gap: "normal",
        confirmation: "confirmed",
        action: "review"
      },
      {
        riskPatterns: [
          {
            id: "normal:confirmed:review",
            title: "정상 갭 + 확인 유지 + 오늘 진입",
            count: 3,
            profitableCount: 1,
            lossCount: 2,
            winRate: 33
          }
        ]
      }
    );

    expect(suggestion.baseStatus).toBe("passed");
    expect(suggestion.status).toBe("watch");
    expect(suggestion.riskPattern?.id).toBe("normal:confirmed:review");
  });
});
