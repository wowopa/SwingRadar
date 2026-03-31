import { describe, expect, it } from "vitest";

import { buildOpeningRecheckReview } from "@/lib/recommendations/opening-recheck-review";

describe("opening recheck review", () => {
  it("builds review metrics from saved opening checks and tracking outcomes", () => {
    const review = buildOpeningRecheckReview(
      [
        {
          scanKey: "2026-04-01T00:05:00.000Z",
          updatedAt: "2026-04-01T00:20:00.000Z",
          items: {
            AAA001: {
              ticker: "AAA001",
              status: "passed",
              suggestedStatus: "passed",
              checklist: {
                gap: "normal",
                confirmation: "confirmed",
                action: "review"
              },
              updatedAt: "2026-04-01T00:10:00.000Z"
            },
            BBB001: {
              ticker: "BBB001",
              status: "avoid",
              suggestedStatus: "avoid",
              checklist: {
                gap: "overheated",
                confirmation: "mixed",
                action: "hold"
              },
              updatedAt: "2026-04-01T00:11:00.000Z"
            },
            CCC001: {
              ticker: "CCC001",
              status: "watch",
              suggestedStatus: "watch",
              checklist: {
                gap: "elevated",
                confirmation: "mixed",
                action: "watch"
              },
              updatedAt: "2026-04-01T00:12:00.000Z"
            }
          }
        }
      ],
      [
        {
          id: "hist-aaa",
          ticker: "AAA001",
          company: "Alpha",
          signalDate: "2026-04-01",
          signalTone: "긍정",
          entryScore: 12,
          result: "성공",
          mfe: 8.2,
          mae: -2.1,
          holdingDays: 3
        },
        {
          id: "hist-bbb",
          ticker: "BBB001",
          company: "Beta",
          signalDate: "2026-04-01",
          signalTone: "주의",
          entryScore: 10,
          result: "무효화",
          mfe: 0.5,
          mae: -7.4,
          holdingDays: 2
        },
        {
          id: "hist-ccc",
          ticker: "CCC001",
          company: "Gamma",
          signalDate: "2026-04-01",
          signalTone: "중립",
          entryScore: 11,
          result: "진행중",
          mfe: 1.2,
          mae: -1.6,
          holdingDays: 1
        }
      ]
    );

    expect(review?.summary.matchedCount).toBe(3);
    expect(review?.summary.resolvedCount).toBe(2);
    expect(review?.summary.passedWinRate).toBe(100);
    expect(review?.summary.avoidedFailureRate).toBe(100);
    expect(review?.statusBreakdown.find((item) => item.status === "passed")).toMatchObject({
      successCount: 1,
      failureCount: 0
    });
    expect(review?.patterns).toHaveLength(3);
  });
});
