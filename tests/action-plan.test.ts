import { describe, expect, it } from "vitest";

import {
  buildTodayActionBoard,
  buildTodayOperatingSummary,
  buildTodayOperatingWorkflow,
  resolveRecommendationActionBucket
} from "@/lib/recommendations/action-plan";

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

  it("builds a three-step workflow around the daily summary", () => {
    const workflow = buildTodayOperatingWorkflow({
      marketStance: "selective",
      marketStanceLabel: "선별 매수",
      summary: "장초 재판정을 통과한 종목 1개 정도만 신중하게 볼 만한 날입니다.",
      maxNewPositions: 1,
      maxConcurrentPositions: 4,
      bucketCounts: {
        buy_now: 1,
        watch_only: 3,
        avoid: 2
      },
      focusNote: "장초 매수 검토 1개만 우선 검토합니다."
    });

    expect(workflow.basisLabel).toBe("전일 종가 기준 장전 계획");
    expect(workflow.steps).toHaveLength(3);
    expect(workflow.steps[1]?.title).toBe("장초 재판정");
    expect(workflow.openingChecklist[0]?.failLabel).toContain("추격 금지");
    expect(workflow.steps[2]?.detail).toContain("최대 1개");
  });

  it("builds a capped today action board from saved recheck decisions", () => {
    const board = buildTodayActionBoard(
      [
        {
          ticker: "005930",
          company: "삼성전자",
          sector: "반도체",
          signalTone: "긍정",
          featuredRank: 1,
          candidateScore: 98,
          activationScore: 74,
          openingRecheck: {
            status: "passed",
            updatedAt: "2026-03-31T00:05:00.000Z"
          }
        },
        {
          ticker: "000660",
          company: "SK하이닉스",
          sector: "반도체",
          signalTone: "긍정",
          featuredRank: 2,
          candidateScore: 94,
          activationScore: 71,
          openingRecheck: {
            status: "passed",
            updatedAt: "2026-03-31T00:06:00.000Z"
          }
        },
        {
          ticker: "035420",
          company: "NAVER",
          sector: "인터넷",
          signalTone: "중립",
          featuredRank: 3,
          candidateScore: 88,
          activationScore: 58,
          openingRecheck: {
            status: "watch",
            updatedAt: "2026-03-31T00:07:00.000Z"
          }
        },
        {
          ticker: "068270",
          company: "셀트리온",
          sector: "제약/바이오",
          signalTone: "주의",
          featuredRank: 4,
          candidateScore: 80,
          activationScore: 42,
          openingRecheck: {
            status: "avoid",
            updatedAt: "2026-03-31T00:08:00.000Z"
          }
        },
        {
          ticker: "051910",
          company: "LG화학",
          sector: "화학",
          signalTone: "중립",
          featuredRank: 5,
          candidateScore: 77,
          activationScore: 49
        }
      ],
      {
        maxNewPositions: 1
      }
    );

    expect(board.summary.buyReviewCount).toBe(1);
    expect(board.summary.watchCount).toBe(2);
    expect(board.summary.avoidCount).toBe(1);
    expect(board.summary.pendingCount).toBe(1);
    expect(board.summary.note).toContain("한도 1개");
    expect(board.sections[0]?.status).toBe("buy_review");
    expect(board.sections[0]?.items[0]?.ticker).toBe("005930");
    expect(board.sections[1]?.items[0]?.boardReason).toContain("관찰");
  });
});
