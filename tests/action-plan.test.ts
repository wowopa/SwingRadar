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
    expect(summary.maxNewPositions).toBe(1);
    expect(summary.bucketCounts).toEqual({
      buy_now: 1,
      watch_only: 1,
      avoid: 1
    });
  });

  it("builds a three-step workflow around the daily summary", () => {
    const workflow = buildTodayOperatingWorkflow({
      marketStance: "selective",
      marketStanceLabel: "선별 매수",
      summary: "장초 확인을 통과한 종목 한 개만 조심스럽게 본다.",
      maxNewPositions: 1,
      maxConcurrentPositions: 4,
      bucketCounts: {
        buy_now: 1,
        watch_only: 3,
        avoid: 2
      },
      focusNote: "상위 1개만 검토한다."
    });

    expect(workflow.steps).toHaveLength(3);
    expect(workflow.steps[0]?.key).toBe("preopen_candidates");
    expect(workflow.steps[1]?.key).toBe("opening_recheck");
    expect(workflow.openingChecklist[0]?.failLabel).toContain("추격 금지");
  });

  it("builds position sizing for buy-review candidates when a portfolio profile is present", () => {
    const board = buildTodayActionBoard(
      [
        {
          ticker: "005930",
          company: "삼성전자",
          sector: "Semiconductor",
          signalTone: "긍정",
          featuredRank: 1,
          candidateScore: 98,
          activationScore: 74,
          tradePlan: {
            currentPrice: 74_500,
            currentPriceLabel: "74,500원",
            entryPriceLow: 74_500,
            entryPriceHigh: 75_000,
            confirmationPrice: 75_000,
            entryLabel: "74,500원 ~ 75,000원",
            stopPrice: 71_000,
            stopLabel: "71,000원",
            targetPrice: 81_000,
            targetLabel: "81,000원",
            stretchTargetPrice: 84_000,
            stretchTargetLabel: "84,000원",
            holdWindowLabel: "5~10거래일",
            riskRewardLabel: "1 : 1.7",
            nextStep: "장초 확인"
          },
          openingRecheck: {
            status: "passed",
            updatedAt: "2026-03-31T00:05:00.000Z"
          }
        },
        {
          ticker: "035420",
          company: "NAVER",
          sector: "Internet",
          signalTone: "중립",
          featuredRank: 2,
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
          sector: "Bio",
          signalTone: "주의",
          featuredRank: 3,
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
          sector: "Chemical",
          signalTone: "중립",
          featuredRank: 4,
          candidateScore: 77,
          activationScore: 49
        }
      ],
      {
        maxNewPositions: 1,
        maxConcurrentPositions: 4
      },
      {
        activeHoldings: [
          {
            ticker: "267260",
            company: "HD Hyundai Electric",
            sector: "Power Equipment"
          }
        ],
        profileName: "실전 운용",
        totalCapital: 50_000_000,
        availableCash: 12_000_000,
        maxRiskPerTradePercent: 0.8
      }
    );

    expect(board.summary.buyReviewCount).toBe(1);
    expect(board.summary.watchCount).toBe(1);
    expect(board.summary.avoidCount).toBe(1);
    expect(board.summary.pendingCount).toBe(1);
    expect(board.summary.activeHoldingCount).toBe(1);
    expect(board.summary.remainingPortfolioSlots).toBe(3);
    expect(board.summary.portfolioProfileName).toBe("실전 운용");
    expect(board.summary.availableCash).toBe(12_000_000);
    expect(board.summary.riskBudgetPerTrade).toBe(400_000);
    expect(board.sections[0]?.status).toBe("buy_review");
    expect(board.sections[0]?.items[0]?.tradePlan?.positionSizing).toMatchObject({
      suggestedQuantity: 100,
      suggestedCapital: 7_500_000,
      suggestedWeightPercent: 15,
      maxLossAmount: 400_000,
      limitSource: "risk_budget"
    });
  });
});

