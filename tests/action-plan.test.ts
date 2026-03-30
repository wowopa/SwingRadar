import { describe, expect, it } from "vitest";

import { buildTodayOperatingSummary, resolveRecommendationActionBucket } from "@/lib/recommendations/action-plan";

describe("recommendation action plan", () => {
  it("treats entry-eligible names as buy now", () => {
    const bucket = resolveRecommendationActionBucket({
      signalTone: "긍정",
      activationScore: 60,
      trackingDiagnostic: {
        isEntryEligible: true,
        stage: "진입 추적 가능"
      }
    });

    expect(bucket).toBe("buy_now");
  });

  it("treats mid-strength names as watch only", () => {
    const bucket = resolveRecommendationActionBucket({
      signalTone: "중립",
      activationScore: 55
    });

    expect(bucket).toBe("watch_only");
  });

  it("summarizes a mixed list into a selective-buy day", () => {
    const summary = buildTodayOperatingSummary([
      {
        ticker: "005930",
        company: "삼성전자",
        signalTone: "긍정",
        activationScore: 72,
        score: 82,
        signalLabel: "돌파 확인"
      },
      {
        ticker: "035420",
        company: "NAVER",
        signalTone: "중립",
        activationScore: 56,
        score: 68,
        signalLabel: "지지 확인 필요"
      },
      {
        ticker: "068270",
        company: "셀트리온",
        signalTone: "주의",
        activationScore: 41,
        score: 44,
        signalLabel: "추격 금지"
      }
    ]);

    expect(summary.marketStance).toBe("selective");
    expect(summary.marketStanceLabel).toBe("선별 매수");
    expect(summary.maxNewPositions).toBe(1);
    expect(summary.bucketCounts.buy_now).toBe(1);
    expect(summary.bucketCounts.watch_only).toBe(1);
    expect(summary.bucketCounts.avoid).toBe(1);
  });
});
