import { describe, expect, it } from "vitest";

import { buildOpeningCheckPatternPreview } from "@/lib/recommendations/opening-check-pattern-preview";

describe("buildOpeningCheckPatternPreview", () => {
  it("returns a risk preview when the current candidate matches a recent losing pattern", () => {
    const result = buildOpeningCheckPatternPreview(
      {
        actionBucket: "watch_only",
        tradePlan: {
          currentPrice: 103_500,
          confirmationPrice: 100_000,
          entryPriceLow: 99_500,
          entryPriceHigh: 100_500
        }
      },
      {
        riskPatterns: [
          {
            id: "overheated:confirmed:watch",
            title: "갭 과열 + 확인 가격 유지 + 관찰",
            count: 3,
            profitableCount: 1,
            lossCount: 2,
            winRate: 33
          }
        ]
      }
    );

    expect(result).toMatchObject({
      kind: "risk",
      label: "최근 장초 주의",
      id: "overheated:confirmed:watch"
    });
  });

  it("returns a positive preview when the candidate matches the recent winning pattern", () => {
    const result = buildOpeningCheckPatternPreview(
      {
        actionBucket: "buy_now",
        tradePlan: {
          currentPrice: 100_500,
          confirmationPrice: 100_000,
          entryPriceLow: 99_500,
          entryPriceHigh: 100_500
        }
      },
      {
        positivePattern: {
          id: "elevated:confirmed:review",
          title: "가벼운 갭 + 확인 가격 유지 + 진입 검토",
          count: 4,
          profitableCount: 3,
          lossCount: 1,
          winRate: 75,
          headline: "최근 잘 맞은 장초 조합",
          detail: "확인 가격이 유지된 채 진입 검토로 이어질 때 성과가 좋았습니다."
        }
      }
    );

    expect(result).toMatchObject({
      kind: "positive",
      label: "최근 잘 맞음",
      id: "elevated:confirmed:review"
    });
  });
});
